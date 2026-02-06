/**
 * FastAPI Backend Client
 *
 * Connects directly to the Risentia FastAPI backend for trial matching.
 * Handles SSE streaming and converts events to the frontend format.
 */

import { PatientProfile } from '@/types';

// =============================================================================
// Configuration
// =============================================================================

const config = {
  apiUrl: process.env.FASTAPI_URL || 'https://risentia-dev-fastapi.victorioustree-1b54be58.westeurope.azurecontainerapps.io',
  apiKey: process.env.FASTAPI_API_KEY,
};

// =============================================================================
// Types
// =============================================================================

export interface PatientInput {
  patient_id: string;
  age: number;
  sex: 'male' | 'female' | 'other';
  primary_diagnosis: string;
  diagnosis_date?: string;
  histology?: string;
  stage?: string;
  biomarkers: Array<{
    name: string;
    status?: string;
    value?: string;
    method?: string;
  }>;
  prior_treatments: string[];
  current_medications: Array<{
    name: string;
    start_date?: string;
    end_date?: string;
    status: string;
  }>;
  lab_values: Array<{
    name: string;
    value: number;
    unit: string;
    date: string;
    is_normal?: boolean;
  }>;
  ecog_status?: number;
  comorbidities: string[];
  clinical_notes?: string;
  preferred_locations: string[];
  max_travel_distance_miles?: number;
}

export interface FastAPIEvent {
  type: string;
  phase?: string;
  message?: string;
  progress?: number;
  candidates?: number;
  keywords?: string[];
  cost_usd?: number;
  nct_id?: string;
  title?: string;
  index?: number;
  total?: number;
  status?: string;
  confidence?: number;
  inclusion_met?: number;
  exclusion_clear?: number;
  success?: boolean;
  // Super-batch fields
  mode?: string;
  total_trials?: number;
  chunk_index?: number;
  total_chunks?: number;
  trials_in_chunk?: number;
  trials_processed?: number;
  passed_count?: number;
  failed_count?: number;
  elapsed_ms?: number;
  timestamp?: string;
  summary?: {
    total_candidates: number;
    total_matched: number;
    total_ranked: number;
    requires_review: boolean;
    processing_time_ms: number;
    cost_usd: number;
  };
  result?: {
    matches: TrialMatch[];
    clinical_narrative?: string;
    top_recommendations?: string[];
    overall_confidence?: number;
    requires_human_review?: boolean;
  };
  error?: string;
}

export interface TrialMatch {
  trial_id: string;
  nct_id: string;
  title: string;
  phase: string;
  status: string;
  therapeutic_area: string;
  overall_score: number;
  recommendation: string;
  criteria_summary: {
    meets: number;
    fails: number;
    insufficient: number;
  };
  criteria_details: Array<{
    criterion_id: string;
    criterion_text: string;
    criterion_type: 'inclusion' | 'exclusion';
    status: string;
    confidence: number;
    evidence: string[];
    reasoning: string;
  }>;
  locations: Array<{
    facility: string;
    city: string;
    state?: string;
    country: string;
  }>;
}

// =============================================================================
// Patient Profile Conversion
// =============================================================================

/**
 * Convert frontend PatientProfile to FastAPI PatientInput format.
 */
export function patientProfileToInput(
  profile: PatientProfile,
  sessionId: string
): PatientInput {
  return {
    patient_id: sessionId,
    age: profile.age || 50,
    sex: (profile.sex?.toLowerCase() as 'male' | 'female' | 'other') || 'other',
    primary_diagnosis: profile.cancerType || 'cancer',
    stage: profile.stage,
    biomarkers: Object.entries(profile.biomarkers).map(([name, value]) => ({
      name,
      status: typeof value === 'string' && value.toLowerCase().includes('positive') ? 'positive' :
              typeof value === 'string' && value.toLowerCase().includes('negative') ? 'negative' : undefined,
      value: typeof value === 'string' ? value : undefined,
    })),
    prior_treatments: profile.priorTreatments,
    current_medications: [],
    lab_values: [],
    ecog_status: profile.ecog,
    comorbidities: [],
    clinical_notes: profile.rawText,
    preferred_locations: [],
  };
}

// =============================================================================
// SSE Stream Parser
// =============================================================================

/**
 * Parse SSE stream from FastAPI backend.
 */
export async function* parseSSEStream(
  response: Response
): AsyncGenerator<FastAPIEvent> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Split by double newlines (SSE event separator)
      const events = buffer.split('\n\n');
      buffer = events.pop() || ''; // Keep incomplete event in buffer

      for (const eventText of events) {
        if (!eventText.trim()) continue;

        // Parse SSE format: "event: type\ndata: json"
        const lines = eventText.split('\n');
        let eventType = 'message';
        let data = '';

        for (const line of lines) {
          if (line.startsWith('event:')) {
            eventType = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            data = line.slice(5).trim();
          }
        }

        if (data) {
          try {
            const parsed = JSON.parse(data) as FastAPIEvent;
            // Use the event type from the parsed data if present
            if (!parsed.type) {
              parsed.type = eventType;
            }
            yield parsed;
          } catch (e) {
            console.error('Failed to parse SSE event:', data, e);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// =============================================================================
// Main API Functions
// =============================================================================

/**
 * Stream trial matching results from FastAPI backend.
 */
export async function* streamMatching(
  patient: PatientInput,
  maxResults: number = 10,
  signal?: AbortSignal
): AsyncGenerator<FastAPIEvent> {
  const url = `${config.apiUrl}/match/stream?max_results=${maxResults}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'text/event-stream',
  };

  if (config.apiKey) {
    headers['X-API-Key'] = config.apiKey;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(patient),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`FastAPI error ${response.status}: ${errorText}`);
  }

  yield* parseSSEStream(response);
}

/**
 * Check if FastAPI backend is healthy.
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${config.apiUrl}/health`, {
      method: 'GET',
      headers: config.apiKey ? { 'X-API-Key': config.apiKey } : {},
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get system status from FastAPI backend.
 */
export async function getSystemStatus(): Promise<{
  status: string;
  trials_loaded: number;
  chromadb_collections: number;
} | null> {
  try {
    const response = await fetch(`${config.apiUrl}/status`, {
      method: 'GET',
      headers: config.apiKey ? { 'X-API-Key': config.apiKey } : {},
    });
    if (response.ok) {
      return response.json();
    }
    return null;
  } catch {
    return null;
  }
}
