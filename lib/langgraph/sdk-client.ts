/**
 * LangGraph SDK Client
 * 
 * Uses @langchain/langgraph-sdk to connect to LangGraph Cloud or self-hosted server.
 * The SDK provides thread management, streaming, and run control.
 */

import { Client } from '@langchain/langgraph-sdk';
import type { Thread, Run } from '@langchain/langgraph-sdk';
import { PatientProfile } from '@/types';

// =============================================================================
// Configuration
// =============================================================================

const config = {
  apiUrl: process.env.LANGGRAPH_API_URL || 'http://localhost:8123',
  apiKey: process.env.LANGGRAPH_API_KEY,
  assistantId: process.env.LANGGRAPH_ASSISTANT_ID || 'trial-matching',
};

let client: Client | null = null;

export function getClient(): Client {
  if (!client) {
    client = new Client({ apiUrl: config.apiUrl, apiKey: config.apiKey });
  }
  return client;
}

// =============================================================================
// Thread Management (Conversation State)
// =============================================================================

export async function createThread(metadata?: Record<string, unknown>): Promise<Thread> {
  return getClient().threads.create({ metadata });
}

export async function getThread(threadId: string): Promise<Thread | null> {
  try {
    return await getClient().threads.get(threadId);
  } catch {
    return null;
  }
}

export async function getThreadState<T>(threadId: string): Promise<T | null> {
  try {
    const state = await getClient().threads.getState(threadId);
    return state.values as T;
  } catch {
    return null;
  }
}

export async function updateThreadState(threadId: string, values: Record<string, unknown>): Promise<void> {
  await getClient().threads.updateState(threadId, { values });
}

// =============================================================================
// Graph Invocation with Streaming
// =============================================================================

export interface GraphInput {
  userMessage: string;
  patientProfile?: PatientProfile;
  triggerMatching?: boolean;
}

export interface StreamEvent {
  event: string;
  name?: string;
  data: unknown;
}

/**
 * Stream events from graph invocation using the SDK.
 */
export async function* streamGraph(
  threadId: string,
  input: GraphInput,
  assistantId = config.assistantId
): AsyncGenerator<StreamEvent> {
  const stream = getClient().runs.stream(threadId, assistantId, {
    input: input as unknown as Record<string, unknown>,
    streamMode: 'events',
  });

  for await (const event of stream) {
    yield event as StreamEvent;
  }
}

/**
 * Invoke graph and wait for result (non-streaming).
 */
export async function invokeGraph(
  threadId: string,
  input: GraphInput,
  assistantId = config.assistantId
): Promise<GraphResult> {
  const result = await getClient().runs.wait(threadId, assistantId, { input: input as unknown as Record<string, unknown> });
  return result as unknown as GraphResult;
}

export interface GraphResult {
  response?: string;
  patientProfile?: PatientProfile;
  matchedTrials?: TrialResult[];
  pipelineResults?: PipelineResult[];
  totalCost?: number;
}

interface TrialResult {
  nctId: string;
  title: string;
  matchScore: number;
}

interface PipelineResult {
  name: string;
  cost: number;
}

// =============================================================================
// Run Management
// =============================================================================

export async function getThreadRuns(threadId: string, limit = 10): Promise<Run[]> {
  return getClient().runs.list(threadId, { limit });
}

export async function cancelRun(threadId: string, runId: string): Promise<void> {
  await getClient().runs.cancel(threadId, runId);
}

// =============================================================================
// Health Check
// =============================================================================

export async function checkHealth(): Promise<boolean> {
  try {
    await getClient().assistants.search({ limit: 1 });
    return true;
  } catch {
    return false;
  }
}

// =============================================================================
// High-Level Chat Function with Streaming
// =============================================================================

export type ChatEvent =
  | { type: 'thread_created'; threadId: string }
  | { type: 'step_start'; step: string }
  | { type: 'step_complete'; step: string; cost?: number }
  | { type: 'complete'; response?: string; patientProfile?: PatientProfile; trials?: unknown[]; totalCost?: number };

/**
 * High-level streaming chat function.
 * Creates thread if needed, streams events, returns final result.
 */
export async function* chat(
  message: string,
  options: { threadId?: string; patientProfile?: PatientProfile; triggerMatching?: boolean } = {}
): AsyncGenerator<ChatEvent> {
  // Create thread if needed
  let threadId = options.threadId;
  if (!threadId) {
    const thread = await createThread();
    threadId = thread.thread_id;
    yield { type: 'thread_created', threadId };
  }

  // Stream the graph
  for await (const event of streamGraph(threadId, {
    userMessage: message,
    patientProfile: options.patientProfile,
    triggerMatching: options.triggerMatching,
  })) {
    if (event.event === 'on_chain_start' && event.name && event.name !== 'LangGraph') {
      yield { type: 'step_start', step: event.name };
    }

    if (event.event === 'on_chain_end') {
      if (event.name && event.name !== 'LangGraph') {
        const output = event.data as Record<string, unknown>;
        yield { type: 'step_complete', step: event.name, cost: output?.totalCost as number | undefined };
      }

      if (event.name === 'LangGraph') {
        const output = (event.data as { output: GraphResult }).output;
        yield {
          type: 'complete',
          response: output?.response,
          patientProfile: output?.patientProfile,
          trials: output?.matchedTrials,
          totalCost: output?.totalCost,
        };
      }
    }
  }
}
