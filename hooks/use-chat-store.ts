'use client';

import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessage, PatientProfile, PipelineStep, TrialMatch, TrialProgressEvent, PIPELINE_STEPS, createEmptyPatientProfile, AppMode } from '@/types';

interface ChatState {
  sessionId: string;
  messages: ChatMessage[];
  isLoading: boolean;
  patientProfile: PatientProfile;
  pipelineSteps: PipelineStep[];
  isPipelineRunning: boolean;
  trials: TrialMatch[];
  totalCost: number;
  mode: AppMode;
  trialProgress: TrialProgressEvent[];
  matchingDetail: string | null;

  sendMessage: (content: string) => Promise<void>;
  reset: () => void;
  setMode: (mode: AppMode) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  sessionId: uuidv4(),
  messages: [],
  isLoading: false,
  patientProfile: createEmptyPatientProfile(),
  pipelineSteps: PIPELINE_STEPS.map(s => ({ ...s, status: 'pending' as const })),
  isPipelineRunning: false,
  trials: [],
  totalCost: 0,
  mode: 'fastapi',
  trialProgress: [],
  matchingDetail: null,

  sendMessage: async (content: string) => {
    const { sessionId, messages, mode } = get();

    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    set({
      messages: [...messages, userMessage],
      isLoading: true,
      pipelineSteps: PIPELINE_STEPS.map(s => ({ ...s, status: 'pending' as const })),
      isPipelineRunning: false,
      trialProgress: [],
      matchingDetail: null,
    });

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: content, mode }),
      });

      if (!response.ok) throw new Error('Failed');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No stream');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              switch (data.type) {
                case 'step_start':
                  set({ isPipelineRunning: true });
                  set(state => ({
                    pipelineSteps: state.pipelineSteps.map(step =>
                      step.name === data.step ? { ...step, status: 'running' as const, detail: data.message || undefined } : step
                    ),
                  }));
                  break;

                case 'step_complete':
                  set(state => ({
                    pipelineSteps: state.pipelineSteps.map(step =>
                      step.name === data.step ? { ...step, status: 'complete' as const, cost: data.cost, detail: undefined } : step
                    ),
                  }));
                  break;

                case 'step_progress':
                  set(state => ({
                    pipelineSteps: state.pipelineSteps.map(step =>
                      step.name === data.step ? { ...step, detail: data.detail || data.message || step.detail } : step
                    ),
                    matchingDetail: data.detail || data.message || state.matchingDetail,
                  }));
                  break;

                case 'trial_progress':
                  set(state => ({
                    trialProgress: [...state.trialProgress, {
                      nctId: data.nctId,
                      title: data.title,
                      index: data.index,
                      total: data.total,
                      status: data.status,
                      confidence: data.confidence,
                    }],
                  }));
                  break;

                case 'response': {
                  const assistantMessage: ChatMessage = {
                    id: uuidv4(),
                    role: 'assistant',
                    content: data.content,
                    timestamp: new Date(),
                    metadata: { patientData: data.patientData, trials: data.trials },
                  };

                  // Mark all steps as complete (defensive)
                  set(state => ({
                    messages: [...state.messages, assistantMessage],
                    patientProfile: data.patientData || state.patientProfile,
                    trials: data.trials || [],
                    totalCost: data.totalCost || 0,
                    isPipelineRunning: false,
                    pipelineSteps: state.pipelineSteps.map(step =>
                      step.status === 'pending' || step.status === 'running'
                        ? { ...step, status: 'complete' as const, detail: undefined }
                        : step
                    ),
                  }));
                  break;
                }

                case 'error': {
                  const errorMessage: ChatMessage = {
                    id: uuidv4(),
                    role: 'assistant',
                    content: `⚠️ ${data.message}`,
                    timestamp: new Date(),
                  };
                  // Mark running steps as error
                  set(state => ({
                    messages: [...state.messages, errorMessage],
                    isPipelineRunning: false,
                    pipelineSteps: state.pipelineSteps.map(step =>
                      step.status === 'running'
                        ? { ...step, status: 'error' as const }
                        : step
                    ),
                  }));
                  break;
                }

                case 'done':
                  // Stream end marker — no-op
                  break;
              }
            } catch (e) {
              console.error('Parse error:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: '⚠️ Error occurred. Please try again.',
        timestamp: new Date(),
      };
      set(state => ({ messages: [...state.messages, errorMessage] }));
    } finally {
      set({ isLoading: false });
    }
  },

  reset: () => {
    set({
      sessionId: uuidv4(),
      messages: [],
      patientProfile: createEmptyPatientProfile(),
      pipelineSteps: PIPELINE_STEPS.map(s => ({ ...s, status: 'pending' as const })),
      isPipelineRunning: false,
      trials: [],
      totalCost: 0,
      trialProgress: [],
      matchingDetail: null,
    });
  },

  setMode: (mode) => set({ mode }),
}));
