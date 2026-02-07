/**
 * LLM-based patient profile extraction using Qwen Flash via DashScope.
 * Replaces the regex-based parsePatientFromMessage for FastAPI mode.
 */

import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';

const PatientExtractionSchema = z.object({
  age: z.number().optional().describe('Patient age in years'),
  sex: z.enum(['Male', 'Female']).optional().describe('Patient sex'),
  cancerType: z.string().optional().describe('Cancer type or diagnosis (e.g. NSCLC, Breast Cancer, Melanoma, Adenocarcinoma, CRC)'),
  stage: z.string().optional().describe('Cancer stage (e.g. Stage IV, Stage IIIB)'),
  biomarkers: z.record(z.string()).optional().describe('Biomarker name → status mapping (e.g. {"EGFR": "Positive", "KRAS": "Negative"})'),
  ecog: z.number().optional().describe('ECOG performance status (0-4)'),
  priorTreatments: z.array(z.string()).optional().describe('List of prior treatments or therapies'),
  pdl1Score: z.string().optional().describe('PD-L1 score (e.g. "TPS 80%")'),
});

let llm: ChatOpenAI | null = null;

function getLLM(): ChatOpenAI {
  if (!llm) {
    llm = new ChatOpenAI({
      model: 'qwen-flash',
      apiKey: process.env.DASHSCOPE_API_KEY,
      configuration: {
        baseURL: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
      },
      temperature: 0,
      maxTokens: 200,
    });
  }
  return llm;
}

export async function extractPatientFromMessage(
  message: string
): Promise<Partial<{
  age?: number;
  sex?: 'Male' | 'Female';
  cancerType?: string;
  stage?: string;
  biomarkers: Record<string, string>;
  priorTreatments: string[];
  pdl1Score?: string;
  ecog?: number;
}>> {
  try {
    const structured = getLLM().withStructuredOutput(PatientExtractionSchema);
    const result = await structured.invoke(
      `Extract patient clinical information from this message. Only extract fields that are explicitly mentioned. If a field is not mentioned, omit it.\n\nMessage: "${message}"`
    );
    return {
      ...(result.age !== undefined ? { age: result.age } : {}),
      ...(result.sex ? { sex: result.sex } : {}),
      ...(result.cancerType ? { cancerType: result.cancerType } : {}),
      ...(result.stage ? { stage: result.stage } : {}),
      biomarkers: result.biomarkers || {},
      priorTreatments: result.priorTreatments || [],
      ...(result.pdl1Score ? { pdl1Score: result.pdl1Score } : {}),
      ...(result.ecog !== undefined ? { ecog: result.ecog } : {}),
    };
  } catch (error) {
    console.error('LLM patient extraction failed, falling back to regex:', error);
    // Dynamic import to avoid circular deps
    const { parsePatientFromMessage } = await import('@/lib/langgraph/graph');
    return parsePatientFromMessage(message);
  }
}
