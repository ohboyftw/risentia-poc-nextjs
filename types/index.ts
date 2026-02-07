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
  rawText?: string;  // Original text used to parse profile
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

export type ModelId = 'qwen-flash' | 'qwen-plus' | 'rule-based' | 'claude-sonnet' | 'claude-haiku';

export interface ModelConfig {
  id: ModelId;
  name: string;
  color: string;
  costPerMToken: { input: number; output: number };
}

export const MODEL_CONFIGS: Record<ModelId, ModelConfig> = {
  'qwen-flash': { id: 'qwen-flash', name: 'Qwen Flash', color: '#FBBF24', costPerMToken: { input: 0.05, output: 0.05 } },
  'qwen-plus': { id: 'qwen-plus', name: 'Qwen Plus', color: '#F59E0B', costPerMToken: { input: 0.40, output: 0.40 } },
  'rule-based': { id: 'rule-based', name: 'Rule-based', color: '#9CA3AF', costPerMToken: { input: 0, output: 0 } },
  'claude-sonnet': { id: 'claude-sonnet', name: 'Claude Sonnet', color: '#8B5CF6', costPerMToken: { input: 3.0, output: 15.0 } },
  'claude-haiku': { id: 'claude-haiku', name: 'Claude Haiku', color: '#A78BFA', costPerMToken: { input: 0.25, output: 1.25 } },
};

export interface PipelineStep {
  name: string;
  description: string;
  model: ModelId;
  status: 'pending' | 'running' | 'complete' | 'error';
  tokens?: { input: number; output: number };
  cost?: number;
  duration?: number;
  progress?: number;
  detail?: string;
}

export interface TrialProgressEvent {
  nctId: string;
  title: string;
  index: number;
  total: number;
  status: string;
  confidence?: number;
}

export const PIPELINE_STEPS: Omit<PipelineStep, 'status'>[] = [
  { name: 'Retrieve Trials', description: 'BM25 + semantic search', model: 'qwen-flash' },
  { name: 'Pre-filter', description: 'Age, gender, ECOG checks', model: 'rule-based' },
  { name: 'Assess Eligibility', description: 'Inclusion/exclusion criteria', model: 'qwen-plus' },
  { name: 'Rank & Report', description: 'Score and explain matches', model: 'claude-sonnet' },
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

// Alias for API compatibility
export type TrialResult = TrialMatch;

// =============================================================================
// Modes
// =============================================================================

export type AppMode = 'local' | 'fastapi';
