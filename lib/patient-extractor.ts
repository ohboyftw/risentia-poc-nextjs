/**
 * LLM-based patient profile extraction using Claude Haiku.
 * Uses @langchain/anthropic (already installed) with structured output.
 */

import { ChatAnthropic } from '@langchain/anthropic';
import { z } from 'zod';

const PatientExtractionSchema = z.object({
  age: z.number().optional().describe('Patient age in years'),
  sex: z.enum(['Male', 'Female']).optional().describe('Patient sex'),
  cancerType: z.string().optional().describe('Cancer type or diagnosis (e.g. NSCLC, Breast Cancer, Melanoma, Adenocarcinoma, CRC)'),
  stage: z.string().optional().describe('Cancer stage (e.g. Stage IV, Stage IIIB)'),
  biomarkers: z.record(z.string()).optional().describe('Biomarker name to status mapping (e.g. {"EGFR": "Positive", "KRAS": "Negative"})'),
  ecog: z.number().optional().describe('ECOG performance status (0-4)'),
  priorTreatments: z.array(z.string()).optional().describe('List of prior treatments or therapies'),
  pdl1Score: z.string().optional().describe('PD-L1 score (e.g. "TPS 80%")'),
});

let llm: ChatAnthropic | null = null;

function getLLM(): ChatAnthropic {
  if (!llm) {
    llm = new ChatAnthropic({
      model: 'claude-haiku-4-5-20251001',
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
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
    console.error('Claude extraction failed, falling back to regex:', error);
    const { parsePatientFromMessage } = await import('@/lib/langgraph/graph');
    return parsePatientFromMessage(message);
  }
}
