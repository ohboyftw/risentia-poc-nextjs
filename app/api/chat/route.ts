/**
 * Chat API Route
 * 
 * Supports two modes:
 * - local: Run graph directly (default)
 * - remote: Use LangGraph SDK to connect to deployed server
 */

import { NextRequest } from 'next/server';
import { createTrialMatchingGraph, shouldTriggerMatchingFromMessage } from '@/lib/langgraph/graph';
import { chat as sdkChat, createThread, checkHealth } from '@/lib/langgraph/sdk-client';
import { PatientProfile, createEmptyPatientProfile } from '@/types';

// In-memory session store (use Redis in production)
const sessions = new Map<string, { patientProfile: PatientProfile; threadId?: string }>();

export async function POST(request: NextRequest) {
  try {
    const { sessionId, message, mode = 'local' } = await request.json();

    if (!sessionId || !message) {
      return Response.json({ error: 'Missing sessionId or message' }, { status: 400 });
    }

    // Get or create session
    let session = sessions.get(sessionId);
    if (!session) {
      session = { patientProfile: createEmptyPatientProfile() };
      sessions.set(sessionId, session);
    }

    const triggerMatching = shouldTriggerMatchingFromMessage(message, session.patientProfile);
    const encoder = new TextEncoder();

    // Choose mode: local or remote (SDK)
    if (mode === 'remote') {
      return handleRemoteMode(encoder, session, sessionId, message, triggerMatching);
    } else {
      return handleLocalMode(encoder, session, sessionId, message, triggerMatching);
    }
  } catch (error) {
    console.error('Chat API error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// =============================================================================
// Local Mode - Run graph directly in Next.js
// =============================================================================

async function handleLocalMode(
  encoder: TextEncoder,
  session: { patientProfile: PatientProfile },
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
// Remote Mode - Use LangGraph SDK
// =============================================================================

async function handleRemoteMode(
  encoder: TextEncoder,
  session: { patientProfile: PatientProfile; threadId?: string },
  sessionId: string,
  message: string,
  triggerMatching: boolean
) {
  // Check if SDK server is available
  const healthy = await checkHealth();
  if (!healthy) {
    return Response.json(
      { error: 'LangGraph server unavailable. Use local mode or check LANGGRAPH_API_URL.' },
      { status: 503 }
    );
  }

  // Create thread if needed
  if (!session.threadId) {
    const thread = await createThread({ sessionId });
    session.threadId = thread.thread_id;
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Use SDK streaming
        for await (const event of sdkChat(message, {
          threadId: session.threadId,
          patientProfile: session.patientProfile,
          triggerMatching,
        })) {
          switch (event.type) {
            case 'step_start':
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({ type: 'step_start', step: event.step })}\n\n`
              ));
              break;

            case 'step_complete':
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({
                  type: 'step_complete',
                  step: event.step,
                  cost: event.cost,
                })}\n\n`
              ));
              break;

            case 'complete':
              if (event.patientProfile) {
                session.patientProfile = event.patientProfile;
              }

              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({
                  type: 'response',
                  content: event.response || '',
                  patientData: event.patientProfile || session.patientProfile,
                  trials: event.trials || [],
                  totalCost: event.totalCost || 0,
                })}\n\n`
              ));
              break;
          }
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
        controller.close();
      } catch (error) {
        console.error('SDK stream error:', error);
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({ type: 'error', message: 'SDK error. Try local mode.' })}\n\n`
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

export async function GET() {
  const health = await checkHealth();
  return Response.json({
    status: 'ok',
    sessions: sessions.size,
    sdkAvailable: health,
  });
}
