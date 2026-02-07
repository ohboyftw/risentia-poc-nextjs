'use client';

import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessage, PatientProfile, PipelineStep, TrialMatch, TrialProgressEvent, PIPELINE_STEPS, createEmptyPatientProfile, AppMode } from '@/types';

// Heartbeat timeout: if no SSE event for this long, assume connection is dead
const HEARTBEAT_TIMEOUT_MS = 45_000; // 45 seconds

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
  lastUserMessage: string | null; // Track last message for retry

  sendMessage: (content: string) => Promise<void>;
  retryLastMessage: () => Promise<void>;
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
  lastUserMessage: null,

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
      lastUserMessage: content,
    });

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: content, mode, patientProfile: get().patientProfile }),
      });

      if (!response.ok) throw new Error('Failed');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No stream');

      const decoder = new TextDecoder();
      let buffer = '';

      // Heartbeat timeout: detect dead connections
      let lastEventTime = Date.now();
      let heartbeatDead = false;
      const heartbeatChecker = setInterval(() => {
        if (Date.now() - lastEventTime > HEARTBEAT_TIMEOUT_MS) {
          heartbeatDead = true;
          reader.cancel();
          clearInterval(heartbeatChecker);
        }
      }, 5000);

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          lastEventTime = Date.now(); // Reset heartbeat on any data
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
                      patientProfile: data.patientData
                        ? {
                            ...state.patientProfile,
                            ...data.patientData,
                            biomarkers: { ...state.patientProfile.biomarkers, ...(data.patientData.biomarkers || {}) },
                            priorTreatments: [...new Set([
                              ...state.patientProfile.priorTreatments,
                              ...(data.patientData.priorTreatments || []),
                            ])],
                          }
                        : state.patientProfile,
                      trials: data.trials || [],
                      totalCost: data.totalCost || 0,
                      isPipelineRunning: false,
                      lastUserMessage: null, // Clear retry state on success
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
                      content: `Error: ${data.message}\n\nYou can retry by clicking the retry button or sending your message again.`,
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
      } finally {
        clearInterval(heartbeatChecker);
      }

      // If stream ended due to heartbeat timeout, surface a specific error
      if (heartbeatDead) {
        throw new Error('Connection lost — no response from server for 45 seconds. The matching may still be running on the backend.');
      }
    } catch (error) {
      console.error('Chat error:', error);
      const msg = error instanceof Error ? error.message : 'Connection error';
      const errorMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: `Error: ${msg}\n\nYou can retry by clicking the retry button or sending your message again.`,
        timestamp: new Date(),
      };
      set(state => ({
        messages: [...state.messages, errorMessage],
        isPipelineRunning: false,
        pipelineSteps: state.pipelineSteps.map(step =>
          step.status === 'running'
            ? { ...step, status: 'error' as const }
            : step
        ),
      }));
    } finally {
      set({ isLoading: false });
    }
  },

  retryLastMessage: async () => {
    const { lastUserMessage, sendMessage } = get();
    if (lastUserMessage) {
      // Remove the last error message before retrying
      set(state => {
        const messages = [...state.messages];
        // Remove trailing error messages
        while (messages.length > 0 && messages[messages.length - 1].role === 'assistant' && messages[messages.length - 1].content.startsWith('Error:')) {
          messages.pop();
        }
        // Remove the user message that triggered the error (sendMessage will re-add it)
        if (messages.length > 0 && messages[messages.length - 1].role === 'user') {
          messages.pop();
        }
        return { messages };
      });
      await sendMessage(lastUserMessage);
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
      lastUserMessage: null,
    });
  },

  setMode: (mode) => set({ mode }),
}));
