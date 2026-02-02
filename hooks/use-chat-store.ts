'use client';

import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessage, PatientProfile, PipelineStep, TrialMatch, PIPELINE_STEPS, createEmptyPatientProfile } from '@/types';

interface ChatState {
  sessionId: string;
  messages: ChatMessage[];
  isLoading: boolean;
  patientProfile: PatientProfile;
  pipelineSteps: PipelineStep[];
  isPipelineRunning: boolean;
  trials: TrialMatch[];
  totalCost: number;
  mode: 'local' | 'remote';

  sendMessage: (content: string) => Promise<void>;
  reset: () => void;
  setMode: (mode: 'local' | 'remote') => void;
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
  mode: 'local',

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
                      step.name === data.step ? { ...step, status: 'running' as const } : step
                    ),
                  }));
                  break;

                case 'step_complete':
                  set(state => ({
                    pipelineSteps: state.pipelineSteps.map(step =>
                      step.name === data.step ? { ...step, status: 'complete' as const, cost: data.cost } : step
                    ),
                  }));
                  break;

                case 'response':
                  const assistantMessage: ChatMessage = {
                    id: uuidv4(),
                    role: 'assistant',
                    content: data.content,
                    timestamp: new Date(),
                    metadata: { patientData: data.patientData, trials: data.trials },
                  };

                  set(state => ({
                    messages: [...state.messages, assistantMessage],
                    patientProfile: data.patientData || state.patientProfile,
                    trials: data.trials || [],
                    totalCost: data.totalCost || 0,
                    isPipelineRunning: false,
                  }));
                  break;

                case 'error':
                  const errorMessage: ChatMessage = {
                    id: uuidv4(),
                    role: 'assistant',
                    content: `⚠️ ${data.message}`,
                    timestamp: new Date(),
                  };
                  set(state => ({ messages: [...state.messages, errorMessage] }));
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
    });
  },

  setMode: (mode) => set({ mode }),
}));
