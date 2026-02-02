// =============================================================================
// Patient Data
// =============================================================================

export interface PatientProfile {
  age?: number;
  sex?: 'Male' | 'Female';
  cancerType?: string;
  histology?: string;
  stage?: string;
  biomarkers: Record<string, string>;
  pdl1Score?: string;
  msiStatus?: string;
  priorTreatments: string[];
  ecog?: number;
}

export const createEmptyPatientProfile = (): PatientProfile => ({
  biomarkers: {},
  priorTreatments: [],
});

// =============================================================================
// Messages
// =============================================================================

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    patientData?: PatientProfile;
    trials?: TrialMatch[];
  };
}

export type IntakeStage = 'welcome' | 'demographics' | 'diagnosis' | 'biomarkers' | 'treatment' | 'review' | 'matching' | 'complete';

// =============================================================================
// Pipeline
// =============================================================================

export type ModelId = 'qwen-7b' | 'qwen-72b' | 'claude-sonnet' | 'claude-haiku';

export interface ModelConfig {
  id: ModelId;
  name: string;
  color: string;
  costPerKToken: { input: number; output: number };
}

export const MODEL_CONFIGS: Record<ModelId, ModelConfig> = {
  'qwen-7b': { id: 'qwen-7b', name: 'Qwen 7B', color: '#FBBF24', costPerKToken: { input: 0.0001, output: 0.0001 } },
  'qwen-72b': { id: 'qwen-72b', name: 'Qwen 72B', color: '#F59E0B', costPerKToken: { input: 0.0006, output: 0.0006 } },
  'claude-sonnet': { id: 'claude-sonnet', name: 'Claude Sonnet', color: '#8B5CF6', costPerKToken: { input: 3.0, output: 15.0 } },
  'claude-haiku': { id: 'claude-haiku', name: 'Claude Haiku', color: '#A78BFA', costPerKToken: { input: 0.25, output: 1.25 } },
};

export interface PipelineStep {
  name: string;
  description: string;
  model: ModelId;
  status: 'pending' | 'running' | 'complete' | 'error';
  tokens?: { input: number; output: number };
  cost?: number;
  duration?: number;
}

export const PIPELINE_STEPS: Omit<PipelineStep, 'status'>[] = [
  { name: 'Parse Patient', description: 'Extract patient data', model: 'qwen-7b' },
  { name: 'Retrieve Trials', description: 'Find candidate trials', model: 'qwen-7b' },
  { name: 'Demographic Filter', description: 'Check demographics', model: 'qwen-7b' },
  { name: 'Biomarker Match', description: 'Match biomarkers', model: 'qwen-72b' },
  { name: 'Eligibility Analysis', description: 'Complex reasoning', model: 'claude-sonnet' },
  { name: 'Generate Summary', description: 'Create response', model: 'claude-haiku' },
];

// =============================================================================
// Trials
// =============================================================================

export interface TrialMatch {
  nctId: string;
  title: string;
  phase: string;
  status: string;
  sponsor: string;
  locations: string[];
  matchScore: number;
  matchReasons: string[];
  concerns: string[];
}
