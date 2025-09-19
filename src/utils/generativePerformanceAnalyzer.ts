import { AppError, ErrorType } from '@/utils/errors';
import logger from '@/utils/logger';
import { PROMPTS } from '@/prompts/prompts';
import {
  SoGVMetrics,
  CitationMetrics,
  SentimentMetrics,
  HallucinationMetrics,
} from '../types/geo';
import { getOpenAIInstance } from '@/utils/openai';

async function analyzeWithAI<T>(prompt: string, model: string = 'gpt-4o-mini'): Promise<T> {
  try {
    const openai = getOpenAIInstance();
    const response = await openai.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new AppError(ErrorType.API_ERROR, 'AI returned an empty response.');
    }
    return JSON.parse(content);
  } catch (error) {
    logger.error('Error in AI analysis', 'generative-performance-analyzer', error);
    throw new AppError(ErrorType.API_ERROR, 'Failed to analyze with AI.');
  }
}

export function calculateSoGVMetrics(
  aiResponses: string[],
  targetBrand: string,
  targetDomain: string,
  competitors: string[]
): { sogv: SoGVMetrics; citation: CitationMetrics } {
  let mentions = 0;
  let citations = 0;
  const topCitedUrls: string[] = [];

  const targetBrandLower = targetBrand.toLowerCase();
  const targetDomainLower = targetDomain.toLowerCase();

  aiResponses.forEach(response => {
    const responseLower = response.toLowerCase();
    if (responseLower.includes(targetBrandLower)) {
      mentions++;
    }
    if (responseLower.includes(targetDomainLower)) {
      citations++;
      // Simple URL extraction (can be improved with regex)
      const urlRegex = new RegExp(`https?:\/\/[^\\s/$.?#].[^\\s]*${targetDomainLower}[^\\s]*`, 'gi');
      const foundUrls = response.match(urlRegex);
      if (foundUrls) {
        topCitedUrls.push(...foundUrls);
      }
    }
  });

  const totalQueries = aiResponses.length || 1;
  const sogvScore = (mentions / totalQueries) * 100;
  const citationRate = (citations / totalQueries) * 100;

  // Analyze competitor mentions
  const competitorScores = competitors.map(name => {
    const competitorMentions = aiResponses.filter(response => 
      response.toLowerCase().includes(name.toLowerCase())
    ).length;
    const score = (competitorMentions / totalQueries) * 100;
    return { name, score: Math.round(score) };
  });

  return {
    sogv: {
      score: sogvScore,
      competitors: competitorScores,
      mentions,
    },
    citation: {
      citationRate,
      citations,
      topCitedUrls: [...new Set(topCitedUrls)].slice(0, 5), // Unique and top 5
    },
  };
}

export async function analyzeSentiment(texts: string[]): Promise<SentimentMetrics> {
  const combinedText = texts.join(' ').substring(0, 4000);
  const prompt = PROMPTS.OPENAI.ANALYZE_SENTIMENT(combinedText);
  const result = await analyzeWithAI<{ positive: string | number; neutral: string | number; negative: string | number }>(prompt);

  const positive = Number(result.positive);
  const neutral = Number(result.neutral);
  const negative = Number(result.negative);

  if (isNaN(positive) || isNaN(neutral) || isNaN(negative)) {
    logger.warn('AI returned non-numeric sentiment values', 'generative-performance-analyzer', { result });
    throw new AppError(ErrorType.VALIDATION, 'AI returned non-numeric sentiment values.');
  }

  let sentimentTrend: 'positive' | 'neutral' | 'negative' | 'mixed' = 'neutral';

  if (positive > neutral && positive > negative) {
    sentimentTrend = 'positive';
  } else if (negative > positive && negative > neutral) {
    sentimentTrend = 'negative';
  } else if (Math.abs(positive - negative) < 10) {
    sentimentTrend = 'mixed';
  }

  return { positive, neutral, negative, sentimentTrend };
}

export async function extractClaimsFromResponses(aiResponses: string[]): Promise<string[]> {
  const combinedResponses = aiResponses.join(' ');
  const prompt = PROMPTS.OPENAI.EXTRACT_CLAIMS(combinedResponses);
  const result = await analyzeWithAI<{ claims: string[] }>(prompt);
  return result.claims || [];
}

export async function verifyClaimsWithRAG(
  claims: string[],
  groundTruth: string
): Promise<HallucinationMetrics> {
  if (!claims.length) {
    return { accuracyScore: 100, examples: [] };
  }
  const prompt = PROMPTS.OPENAI.VERIFY_CLAIMS(claims, groundTruth);
  const result = await analyzeWithAI<{
    examples: Array<{
      claim: string;
      sourceText: string;
      verificationResult: 'verified' | 'unverified' | 'contradictory';
      explanation: string;
    }>;
  }>(prompt);

  const verifiedCount = result.examples.filter(e => e.verificationResult === 'verified').length;
  const accuracyScore = (verifiedCount / result.examples.length) * 100;

  return {
    accuracyScore: Math.round(accuracyScore),
    examples: result.examples,
  };
}
import 'server-only';
