/* eslint-disable @typescript-eslint/no-explicit-any */
import type { AggregatedAnalysisResult, BusinessModelAnalysis, CompetitorAnalysis, EEATAnalysis, TargetAudienceAnalysis } from '@/types/analysis';
import * as openai from '@/utils/openai';
import * as gemini from '@/utils/gemini';
import { AppError, ErrorType } from '@/utils/errors';

type AnyFn = (...args: any[]) => Promise<any>;

function now() { return Date.now(); }

async function tryCall<T>(label: 'OpenAI' | 'Gemini', modelName: string, fn: AnyFn, args: any[]): Promise<{ res?: { platform: 'OpenAI' | 'Gemini'; model: string; duration: number; data: T }, err?: string }> {
  const start = now();
  try {
    const data = await fn(...args);
    const duration = now() - start;
    return { res: { platform: label, model: modelName, duration, data } };
  } catch (e: any) {
    const duration = now() - start;
    const msg = `${label} error after ${duration}ms: ${e?.message || e}`;
    return { err: msg };
  }
}

async function aggregateDual<T>(
  fnName: keyof typeof openai & keyof typeof gemini,
  args: any[]
): Promise<AggregatedAnalysisResult<T>> {
  const errors: string[] = [];
  let openaiResult: any;
  let geminiResult: any;

  const openaiFn: AnyFn | undefined = (openai as any)[fnName];
  const geminiFn: AnyFn | undefined = (gemini as any)[fnName];
  const openaiConfiguredFlag = (openai as any).isOpenAIConfigured?.() ?? true;
  const geminiConfiguredFlag = (gemini as any).isGeminiConfigured?.() ?? true;
  const openaiConfigured = openaiConfiguredFlag && typeof openaiFn === 'function';
  const geminiConfigured = geminiConfiguredFlag && typeof geminiFn === 'function';

  if (!openaiConfigured && !geminiConfigured) {
    throw new AppError(ErrorType.UNKNOWN, 'All AI platforms failed');
  }

  if (openaiConfigured) {
    const modelName = (openai as any).MODEL_NAMES?.DEFAULT || 'openai-default';
    const { res, err } = await tryCall<T>('OpenAI', modelName, openaiFn, args);
    if (res) openaiResult = res; else if (err) errors.push(err);
  }

  if (geminiConfigured) {
    const modelName = (gemini as any).MODEL_NAMES?.DEFAULT || 'gemini-default';
    const { res, err } = await tryCall<T>('Gemini', modelName, geminiFn, args);
    if (res) geminiResult = res; else if (err) errors.push(err);
  }

  const combined = (openaiResult?.data ?? geminiResult?.data) as T;
  if (!combined) {
    throw new AppError(ErrorType.UNKNOWN, 'All AI platforms failed');
  }

  return {
    openai: openaiResult,
    gemini: geminiResult,
    combined,
    errors,
  } as AggregatedAnalysisResult<T>;
}

export async function analyzeBusinessModel(content: string): Promise<AggregatedAnalysisResult<BusinessModelAnalysis>> {
  return aggregateDual<BusinessModelAnalysis>('analyzeBusinessModel', [content]);
}

export async function analyzeTargetAudience(content: string): Promise<AggregatedAnalysisResult<TargetAudienceAnalysis>> {
  return aggregateDual<TargetAudienceAnalysis>('analyzeTargetAudience', [content]);
}

export async function analyzeCompetitors(content: string, url: string): Promise<AggregatedAnalysisResult<CompetitorAnalysis>> {
  return aggregateDual<CompetitorAnalysis>('analyzeCompetitors', [content, url]);
}

export async function analyzeEEATSignals(content: string, sector: string, audience: string): Promise<AggregatedAnalysisResult<EEATAnalysis>> {
  return aggregateDual<EEATAnalysis>('analyzeEEATSignals', [content, sector, audience]);
}

export async function generateDelfiAgenda(prometheusReport: any): Promise<AggregatedAnalysisResult<any>> {
  return aggregateDual<any>('generateDelfiAgenda', [prometheusReport]);
}

export default {};
import 'server-only';

/* a */
