/* eslint-disable @typescript-eslint/no-explicit-any */
import { OpenAI } from 'openai';
import { ContentVisibilityResult } from '@/types/content';
import { AppError, ErrorCode, ErrorType } from '@/utils/errors';
import logger from '@/utils/logger';
import { PROMPTS } from '@/prompts/prompts';
import {
  BusinessModelAnalysis,
  CompetitorAnalysis,
  DelfiAgenda,
  EEATAnalysis,
  TargetAudienceAnalysis,
} from '@/types/analysis';
import { GenerativePerformanceReport } from '@/types/geo';

// API anahtarları
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Model isimleri (Maliyet optimizasyonu için gpt-4o-mini'ye güncellendi)
export const MODEL_NAMES = {
  DEFAULT: 'gpt-4o-mini',
  GPT_4O_MINI: 'gpt-4o-mini',
  GPT_4_TURBO: 'gpt-4-turbo',
};

// Gecikmeli başlatma için istemci değişkeni
let openai: OpenAI | null = null;

export function getOpenAIInstance(): OpenAI {
  if (!openai) {
    if (!OPENAI_API_KEY) {
      throw new Error("The OPENAI_API_KEY environment variable is missing or empty.");
    }
    openai = new OpenAI({ apiKey: OPENAI_API_KEY });
  }
  return openai;
}

export function isOpenAIConfigured(): boolean {
  return !!OPENAI_API_KEY;
}

export async function checkContentVisibility(url: string, query: string): Promise<ContentVisibilityResult> {
  try {
    const client = getOpenAIInstance();
    const prompt = PROMPTS.OPENAI.CHECK_VISIBILITY(url, query, '');

    const response = await client.chat.completions.create({
      model: MODEL_NAMES.DEFAULT,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });
    
    const responseContent = response.choices[0]?.message?.content;

    if (!responseContent) {
      throw new AppError(ErrorType.API_ERROR, 'OpenAI returned an empty response.');
    }

    return JSON.parse(responseContent);
  } catch (error) {
    logger.error('Error in checkContentVisibility', 'openai-utility', error);
    throw new AppError(ErrorType.API_ERROR, 'Failed to check content visibility.');
  }
}

export async function generatePotentialQueries(
  domain: string,
  options?: {
    model?: string;
    apiKey?: string;
    count?: number;
    useAzure?: boolean;
    azureDeployment?: string;
  }
): Promise<any> {
  try {
    const client = getOpenAIInstance();
    const count = options?.count || 15;
    const model = options?.model || MODEL_NAMES.DEFAULT;
    const systemPrompt = PROMPTS.OPENAI.GENERATE_QUERIES(domain, count);
    
    const response = await client.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate ${count} queries for ${domain}.` }
      ],
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new AppError(ErrorType.API_ERROR, 'OpenAI returned an empty response for queries.');
    }
    return JSON.parse(content);
  } catch (error) {
    logger.error('Error in generatePotentialQueries', 'openai-utility', error);
    throw new AppError(ErrorType.API_ERROR, 'Failed to generate potential queries.');
  }
}

export async function analyzeBusinessModel(content: string): Promise<BusinessModelAnalysis> {
  try {
    const client = getOpenAIInstance();
    const prompt = PROMPTS.OPENAI.ANALYZE_BUSINESS_MODEL(content);

    const response = await client.chat.completions.create({
      model: MODEL_NAMES.DEFAULT,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });

    const responseContent = response.choices[0]?.message?.content;
    if (!responseContent) {
      throw new AppError(ErrorType.API_ERROR, 'OpenAI returned an empty response for business model analysis.', {
        errorCode: ErrorCode.OPENAI_ANALYSIS_FAILED,
      });
    }
    return JSON.parse(responseContent);
  } catch (error) {
    logger.error('Error in analyzeBusinessModel', 'openai-utility', error);
    throw new AppError(ErrorType.API_ERROR, 'Failed to analyze business model with OpenAI.', {
      errorCode: ErrorCode.OPENAI_ANALYSIS_FAILED,
      originalError: error,
    });
  }
}

export async function analyzeTargetAudience(content: string): Promise<TargetAudienceAnalysis> {
  try {
    const client = getOpenAIInstance();
    const prompt = PROMPTS.OPENAI.ANALYZE_TARGET_AUDIENCE(content);

    const response = await client.chat.completions.create({
      model: MODEL_NAMES.DEFAULT,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });

    const responseContent = response.choices[0]?.message?.content;
    if (!responseContent) {
      throw new AppError(ErrorType.API_ERROR, 'OpenAI returned an empty response for target audience analysis.', {
        errorCode: ErrorCode.OPENAI_ANALYSIS_FAILED,
      });
    }
    return JSON.parse(responseContent);
  } catch (error) {
    logger.error('Error in analyzeTargetAudience', 'openai-utility', error);
    throw new AppError(ErrorType.API_ERROR, 'Failed to analyze target audience with OpenAI.', {
      errorCode: ErrorCode.OPENAI_ANALYSIS_FAILED,
      originalError: error,
    });
  }
}

export async function analyzeCompetitors(content: string, url: string): Promise<CompetitorAnalysis> {
  try {
    const client = getOpenAIInstance();
    const prompt = PROMPTS.OPENAI.ANALYZE_COMPETITORS(content, url);

    const response = await client.chat.completions.create({
      model: MODEL_NAMES.DEFAULT,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });

    const responseContent = response.choices[0]?.message?.content;
    if (!responseContent) {
      throw new AppError(ErrorType.API_ERROR, 'OpenAI returned an empty response for competitor analysis.', {
        errorCode: ErrorCode.OPENAI_ANALYSIS_FAILED,
      });
    }
    return JSON.parse(responseContent);
  } catch (error) {
    logger.error('Error in analyzeCompetitors', 'openai-utility', error);
    throw new AppError(ErrorType.API_ERROR, 'Failed to analyze competitors with OpenAI.', {
      errorCode: ErrorCode.OPENAI_ANALYSIS_FAILED,
      originalError: error,
    });
  }
}

export async function analyzeEEATSignals(
  content: string,
  sector: string,
  audience: string
): Promise<EEATAnalysis> {
  try {
    const client = getOpenAIInstance();
    const prompt = PROMPTS.OPENAI.ANALYZE_EEAT_SIGNALS(content, sector, audience);

    const response = await client.chat.completions.create({
      model: MODEL_NAMES.DEFAULT,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });

    const responseContent = response.choices[0]?.message?.content;
    if (!responseContent) {
      throw new AppError(ErrorType.API_ERROR, 'OpenAI returned an empty response for E-E-A-T analysis.', {
        errorCode: ErrorCode.OPENAI_ANALYSIS_FAILED,
      });
    }
    return JSON.parse(responseContent);
  } catch (error) {
    logger.error('Error in analyzeEEATSignals', 'openai-utility', error);
    throw new AppError(ErrorType.API_ERROR, 'Failed to analyze E-E-A-T signals with OpenAI.', {
      errorCode: ErrorCode.OPENAI_ANALYSIS_FAILED,
      originalError: error,
    });
  }
}

export async function generateDelfiAgenda(prometheusReport: any): Promise<DelfiAgenda> {
  try {
    const client = getOpenAIInstance();
    // Prometheus raporunu string'e çevir
    const reportString = typeof prometheusReport === 'string' ? prometheusReport : JSON.stringify(prometheusReport, null, 2);
    const prompt = PROMPTS.OPENAI.GENERATE_DELFI_AGENDA(reportString);

    const response = await client.chat.completions.create({
      model: MODEL_NAMES.DEFAULT,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });

    const responseContent = response.choices[0]?.message?.content;
    if (!responseContent) {
      throw new AppError(ErrorType.API_ERROR, 'OpenAI returned an empty response for Delfi agenda generation.', {
        errorCode: ErrorCode.OPENAI_ANALYSIS_FAILED,
      });
    }
    return JSON.parse(responseContent);
  } catch (error) {
    logger.error('Error in generateDelfiAgenda', 'openai-utility', error);
    throw new AppError(ErrorType.API_ERROR, 'Failed to generate Delfi agenda with OpenAI.', {
      errorCode: ErrorCode.OPENAI_ANALYSIS_FAILED,
      originalError: error,
    });
  }
}

export async function generateGenerativePerformanceReport(content: string, competitors: string[]): Promise<GenerativePerformanceReport> {
  try {
    const client = getOpenAIInstance();
    const prompt = PROMPTS.OPENAI.GENERATE_GENERATIVE_PERFORMANCE_REPORT(content, competitors);

    const response = await client.chat.completions.create({
      model: MODEL_NAMES.DEFAULT,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });

    const responseContent = response.choices[0]?.message?.content;
    if (!responseContent) {
      throw new AppError(ErrorType.API_ERROR, 'OpenAI returned an empty response for generative performance report.');
    }
    return JSON.parse(responseContent);
  } catch (error) {
    logger.error('Error in generateGenerativePerformanceReport', 'openai-utility', error);
    throw new AppError(ErrorType.API_ERROR, 'Failed to generate generative performance report with OpenAI.');
  }
}

export default {
  isOpenAIConfigured,
  checkContentVisibility,
  generatePotentialQueries,
  analyzeBusinessModel,
  analyzeTargetAudience,
  analyzeCompetitors,
  analyzeEEATSignals,
  generateDelfiAgenda,
  generateGenerativePerformanceReport,
  MODEL_NAMES,
};
import 'server-only';
