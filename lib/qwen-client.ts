import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { generateText, ModelMessage } from 'ai';

const dashscope = createOpenAICompatible({
  name: 'dashscope',
  apiKey: process.env.DASHSCOPE_API_KEY ?? '',
  baseURL: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
});

const SYSTEM_PROMPT = `You are Risentia's clinical trial matching assistant. Your role:

1. GUIDE users to describe their patient profile for trial matching
2. ANSWER questions about the trial matching system, clinical trials, eligibility criteria, cancer types, biomarkers, and treatment options
3. EXTRACT patient data from conversational messages — when users mention age, sex, diagnosis, stage, biomarkers, ECOG, or prior treatments, acknowledge what you captured
4. DEFLECT off-topic questions — for anything unrelated to clinical trials or healthcare, politely redirect: "That's outside my expertise. Try Google or Perplexity for that. I'm here to help you find matching clinical trials."

Key facts about this system:
- It matches patients to clinical trials from a database of 10,000+ trials
- Users describe a patient profile, then say "find trials" to trigger matching
- The system uses AI to assess eligibility criteria (inclusion/exclusion)
- Returns ranked trial results with match scores and explanations
- Required patient info: age, cancer type. Helpful: stage, biomarkers, ECOG, prior treatments

Keep responses concise (2-4 sentences). Use markdown for formatting when helpful.`;

export async function chatWithQwen(
  userMessage: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> {
  const messages: ModelMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...conversationHistory.slice(-6), // Last 3 exchanges for context
    { role: 'user', content: userMessage },
  ];

  const { text } = await generateText({
    model: dashscope('qwen-flash'),
    messages,
    maxOutputTokens: 300,
    temperature: 0.7,
  });

  return text || 'I can help you find matching clinical trials. Please describe your patient profile.';
}
