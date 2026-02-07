/**
 * Chat API Route
 *
 * Supports three modes:
 * - local: Run graph directly with mock data (default)
 * - remote: Use LangGraph SDK to connect to LangGraph server
 * - fastapi: Connect directly to Risentia FastAPI backend (production)
 */

import { NextRequest } from 'next/server';
import { createTrialMatchingGraph, shouldTriggerMatchingFromMessage, parsePatientFromMessage, extractMaxResultsFromMessage } from '@/lib/langgraph/graph';
import { extractPatientFromMessage } from '@/lib/patient-extractor';
import { chat as sdkChat, createThread, checkHealth } from '@/lib/langgraph/sdk-client';
import {
  streamMatching,
  patientProfileToInput,
  checkHealth as checkFastAPIHealth,
  FastAPIEvent,
} from '@/lib/fastapi-client';
import { chatWithQwen } from '@/lib/qwen-client';
import { PatientProfile, createEmptyPatientProfile, TrialResult } from '@/types';

// In-memory session store (use Redis in production)
interface Session {
  patientProfile: PatientProfile;
  threadId?: string;
  chatHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
}
const sessions = new Map<string, Session>();

export async function POST(request: NextRequest) {
  try {
    const { sessionId, message, mode = 'local' } = await request.json();

    if (!sessionId || !message) {
      return Response.json({ error: 'Missing sessionId or message' }, { status: 400 });
    }

    // Get or create session
    let session = sessions.get(sessionId);
    if (!session) {
      session = { patientProfile: createEmptyPatientProfile(), chatHistory: [] };
      sessions.set(sessionId, session);
    }

    const triggerMatching = shouldTriggerMatchingFromMessage(message, session.patientProfile);
    const encoder = new TextEncoder();

    // Choose mode: local (mock) or fastapi
    if (mode === 'fastapi') {
      return handleFastAPIMode(encoder, session, sessionId, message, triggerMatching);
    } else {
      return handleLocalMode(encoder, session, sessionId, message, triggerMatching);
    }
  } catch (error) {
    console.error('Chat API error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// =============================================================================
// Local Mode - Run graph directly in Next.js (mock data)
// =============================================================================

async function handleLocalMode(
  encoder: TextEncoder,
  session: Session,
  sessionId: string,
  message: string,
  triggerMatching: boolean
) {
  const graph = createTrialMatchingGraph();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const streamEvents = graph.streamEvents(
          {
            userMessage: message,
            sessionId,
            patientProfile: session.patientProfile,
            triggerMatching,
          },
          { version: 'v2' }
        );

        let finalState: Record<string, unknown> = {};

        for await (const event of streamEvents) {
          // Step started
          if (event.event === 'on_chain_start' && event.name && event.name !== 'LangGraph') {
            controller.enqueue(encoder.encode(
              `data: ${JSON.stringify({ type: 'step_start', step: event.name })}\n\n`
            ));
          }

          // Step completed
          if (event.event === 'on_chain_end') {
            if (event.name && event.name !== 'LangGraph') {
              const output = event.data?.output as Record<string, unknown> || {};
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({
                  type: 'step_complete',
                  step: event.name,
                  cost: output?.totalCost,
                })}\n\n`
              ));
            }

            if (event.name === 'LangGraph') {
              finalState = event.data?.output as Record<string, unknown> || {};
            }
          }
        }

        // Update session
        if (finalState?.patientProfile) {
          session.patientProfile = finalState.patientProfile as PatientProfile;
        }

        // Send final response
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({
            type: 'response',
            content: finalState?.response || 'Error processing request.',
            patientData: finalState?.patientProfile || session.patientProfile,
            trials: finalState?.matchedTrials || [],
            pipelineResults: finalState?.pipelineResults || [],
            totalCost: finalState?.totalCost || 0,
          })}\n\n`
        ));

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
        controller.close();
      } catch (error) {
        console.error('Stream error:', error);
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({ type: 'error', message: 'Processing error.' })}\n\n`
        ));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// =============================================================================
// FastAPI Mode - Connect directly to Risentia FastAPI backend
// =============================================================================

async function handleFastAPIMode(
  encoder: TextEncoder,
  session: Session,
  sessionId: string,
  message: string,
  triggerMatching: boolean
) {
  // Use LLM-based extraction (falls back to regex on failure)
  const parsedProfile = await extractPatientFromMessage(message);
  const hasPatientData = Object.keys(parsedProfile).some(
    k => k !== 'biomarkers' && k !== 'priorTreatments' && parsedProfile[k as keyof typeof parsedProfile] !== undefined
  ) || Object.keys(parsedProfile.biomarkers || {}).length > 0 || (parsedProfile.priorTreatments || []).length > 0;

  if (hasPatientData) {
    session.patientProfile = {
      ...session.patientProfile,
      ...parsedProfile,
      biomarkers: { ...session.patientProfile.biomarkers, ...parsedProfile.biomarkers },
      priorTreatments: [
        ...new Set([...session.patientProfile.priorTreatments, ...(parsedProfile.priorTreatments || [])]),
      ],
      rawText: message,
    };
  }

  // If not triggering matching, chat with Qwen LLM
  if (!triggerMatching) {
    let content: string;
    try {
      content = await chatWithQwen(message, session.chatHistory);
    } catch (err) {
      console.error('Qwen chat error:', err);
      // Graceful fallback if DashScope is unavailable
      content = hasPatientData
        ? `Got it — I've updated your patient profile. Say **"find trials"** when you're ready to search.`
        : `I'm your clinical trial matching assistant. Describe a patient profile (age, cancer type, stage, biomarkers) and I'll help find matching trials.`;
    }

    // Update chat history
    session.chatHistory.push({ role: 'user', content: message });
    session.chatHistory.push({ role: 'assistant', content });
    // Keep history bounded (last 20 messages)
    if (session.chatHistory.length > 20) {
      session.chatHistory = session.chatHistory.slice(-20);
    }
    sessions.set(sessionId, session);

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({
            type: 'response',
            content,
            patientData: session.patientProfile,
            trials: [],
            totalCost: 0,
          })}\n\n`
        ));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  }

  // Check FastAPI health
  const healthy = await checkFastAPIHealth();
  if (!healthy) {
    return Response.json(
      { error: 'FastAPI backend unavailable. Check FASTAPI_URL configuration.' },
      { status: 503 }
    );
  }

  // Convert patient profile to API format
  const patientInput = patientProfileToInput(session.patientProfile, sessionId);

  // 4-minute timeout (must be under Vercel's 300s function limit)
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), 4 * 60 * 1000);

  const stream = new ReadableStream({
    async start(controller) {
      try {
        let totalCost = 0;
        const trials: TrialResult[] = [];
        let matchingMode = ''; // 'super_batch' or 'sequential'

        // Extract max_results from user message (e.g. "find top 2 trials" → 2, default 5)
        const maxResults = extractMaxResultsFromMessage(message);

        // Stream from FastAPI backend
        for await (const event of streamMatching(patientInput, maxResults, abortController.signal)) {
          switch (event.type) {
            // ---------------------------------------------------------------
            // Phase lifecycle events → map to 4 frontend steps
            // ---------------------------------------------------------------
            case 'phase_start': {
              const phase = event.phase || '';
              if (phase === 'retrieval') {
                controller.enqueue(encoder.encode(
                  `data: ${JSON.stringify({ type: 'step_start', step: 'Retrieve Trials', message: event.message })}\n\n`
                ));
              } else if (phase === 'matching') {
                matchingMode = event.mode || '';
                // Start Pre-filter step
                controller.enqueue(encoder.encode(
                  `data: ${JSON.stringify({ type: 'step_start', step: 'Pre-filter', message: event.message })}\n\n`
                ));
                // In sequential mode (no super-batch), there are no prefilter events,
                // so auto-complete Pre-filter and start Assess Eligibility immediately
                if (matchingMode !== 'super_batch') {
                  controller.enqueue(encoder.encode(
                    `data: ${JSON.stringify({ type: 'step_complete', step: 'Pre-filter' })}\n\n`
                  ));
                  controller.enqueue(encoder.encode(
                    `data: ${JSON.stringify({ type: 'step_start', step: 'Assess Eligibility', message: 'Sequential matching' })}\n\n`
                  ));
                }
              } else if (phase === 'ranking') {
                controller.enqueue(encoder.encode(
                  `data: ${JSON.stringify({ type: 'step_start', step: 'Rank & Report', message: event.message })}\n\n`
                ));
              }
              break;
            }

            case 'phase_complete': {
              const phase = event.phase || '';
              if (event.cost_usd) totalCost += event.cost_usd;

              if (phase === 'retrieval') {
                controller.enqueue(encoder.encode(
                  `data: ${JSON.stringify({ type: 'step_complete', step: 'Retrieve Trials', cost: event.cost_usd, candidates: event.candidates })}\n\n`
                ));
              } else if (phase === 'matching') {
                controller.enqueue(encoder.encode(
                  `data: ${JSON.stringify({ type: 'step_complete', step: 'Assess Eligibility', cost: event.cost_usd })}\n\n`
                ));
              } else if (phase === 'ranking') {
                controller.enqueue(encoder.encode(
                  `data: ${JSON.stringify({ type: 'step_complete', step: 'Rank & Report', cost: event.cost_usd })}\n\n`
                ));
              }
              break;
            }

            // ---------------------------------------------------------------
            // Super-batch events → Pre-filter + Assess Eligibility progress
            // ---------------------------------------------------------------
            case 'super_batch_start':
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({ type: 'step_progress', step: 'Pre-filter', detail: `Super-batch: ${event.total_trials || '?'} trials` })}\n\n`
              ));
              break;

            case 'prefilter_start':
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({ type: 'step_progress', step: 'Pre-filter', detail: `Pre-filtering ${event.total_trials || '?'} trials...` })}\n\n`
              ));
              break;

            case 'prefilter_complete':
              // Pre-filter done → complete it and start Assess Eligibility
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({ type: 'step_complete', step: 'Pre-filter', detail: `${event.passed_count || 0} passed / ${event.failed_count || 0} failed` })}\n\n`
              ));
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({ type: 'step_start', step: 'Assess Eligibility', message: 'Assessing eligibility criteria' })}\n\n`
              ));
              break;

            case 'exclusion_chunk_start':
            case 'exclusion_chunk_complete':
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({ type: 'step_progress', step: 'Assess Eligibility', detail: `Exclusion: chunk ${event.chunk_index ?? '?'}/${event.total_chunks ?? '?'}` })}\n\n`
              ));
              break;

            case 'inclusion_chunk_start':
            case 'inclusion_chunk_complete':
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({ type: 'step_progress', step: 'Assess Eligibility', detail: `Inclusion: chunk ${event.chunk_index ?? '?'}/${event.total_chunks ?? '?'}` })}\n\n`
              ));
              break;

            case 'exclusion_phase_complete':
            case 'inclusion_phase_complete':
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({ type: 'step_progress', step: 'Assess Eligibility', detail: event.message || 'Phase complete' })}\n\n`
              ));
              break;

            case 'batch_complete':
              if (event.cost_usd) totalCost += event.cost_usd;
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({ type: 'step_progress', step: 'Assess Eligibility', detail: `Batch done: ${event.trials_processed || '?'} trials processed` })}\n\n`
              ));
              break;

            case 'super_batch_fallback':
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({ type: 'step_progress', step: 'Assess Eligibility', detail: 'Falling back to sequential mode...' })}\n\n`
              ));
              break;

            // ---------------------------------------------------------------
            // Trial-level progress
            // ---------------------------------------------------------------
            case 'trial_matched':
              if (event.cost_usd) totalCost += event.cost_usd;
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({
                  type: 'trial_progress',
                  nctId: event.nct_id,
                  title: event.title,
                  index: event.index,
                  total: event.total,
                  status: event.status,
                  confidence: event.confidence,
                })}\n\n`
              ));
              break;

            // ---------------------------------------------------------------
            // Final results
            // ---------------------------------------------------------------
            case 'complete':
              if (event.result?.matches) {
                for (const match of event.result.matches) {
                  trials.push({
                    nctId: match.nct_id,
                    title: match.title,
                    phase: match.phase,
                    status: match.status,
                    sponsor: '', // Backend doesn't include sponsor in TrialMatchResponse yet
                    matchScore: match.overall_score,
                    matchReasons: match.criteria_details
                      .filter(c => c.status === 'MEETS_CRITERION')
                      .slice(0, 3)
                      .map(c => c.reasoning),
                    concerns: match.criteria_details
                      .filter(c => c.status === 'FAILS_CRITERION' || c.status === 'INSUFFICIENT_INFO')
                      .slice(0, 2)
                      .map(c => c.reasoning),
                    locations: match.locations?.map(l => `${l.city}, ${l.country}`) || [],
                  });
                }
              }

              // Defensively mark all steps complete
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({
                  type: 'response',
                  content: event.result?.clinical_narrative ||
                    `Found ${trials.length} matching trials for your patient.`,
                  patientData: session.patientProfile,
                  trials,
                  totalCost: event.summary?.cost_usd || totalCost,
                  summary: event.summary,
                })}\n\n`
              ));
              break;

            // ---------------------------------------------------------------
            // Errors
            // ---------------------------------------------------------------
            case 'error':
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({
                  type: 'error',
                  message: event.message || event.error || 'Unknown error from backend',
                })}\n\n`
              ));
              break;

            // ---------------------------------------------------------------
            // Heartbeat / unknown
            // ---------------------------------------------------------------
            case 'heartbeat':
              // Forward heartbeat to client to keep connection alive and reset heartbeat timeout
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({ type: 'step_progress', step: 'Assess Eligibility', detail: 'Processing...' })}\n\n`
              ));
              break;

            default:
              console.log(`[FastAPI SSE] Unhandled event type: ${event.type}`, event);
              break;
          }
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
        controller.close();
      } catch (error) {
        console.error('FastAPI stream error:', error);
        const msg = error instanceof Error
          ? (error.name === 'AbortError' ? 'Request timed out — the matching is still processing on the backend. Please retry in a moment.' : error.message)
          : 'FastAPI connection error';
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({ type: 'error', message: msg })}\n\n`
        ));
        controller.close();
      } finally {
        clearTimeout(timeout);
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

export async function GET() {
  const [sdkHealth, fastApiHealth] = await Promise.all([
    checkHealth(),
    checkFastAPIHealth(),
  ]);

  return Response.json({
    status: 'ok',
    sessions: sessions.size,
    sdkAvailable: sdkHealth,
    fastApiAvailable: fastApiHealth,
  });
}
