import { AppError, ErrorType } from '@/utils/errors';
import logger from '@/utils/logger';
import { AnalysisJob, GenerativePerformanceReport } from '@/types/geo';
import {
  calculateSoGVMetrics,
  analyzeSentiment,
  extractClaimsFromResponses,
  verifyClaimsWithRAG,
} from '@/utils/generativePerformanceAnalyzer';
import { getAiResponsesForQueries } from '@/utils/aiSearch'; // Assuming this function exists

export async function runGenerativePerformanceAnalysis(
  job: AnalysisJob,
  targetBrand: string
): Promise<GenerativePerformanceReport> {
  logger.info(`Starting Generative Performance analysis for job ${job.id}`, 'generative-performance-service');

  if (!job.arkheReport || !job.arkheReport.competitors.businessCompetitors) {
    throw new AppError(ErrorType.VALIDATION, 'Arkhe report with competitors is required.');
  }
  if (!job.scrapedContent) {
    throw new AppError(ErrorType.VALIDATION, 'Scraped content is required for RAG analysis.');
  }

  try {
    // 1. Data Collection (Simulated)
    // In a real scenario, we would use Perplexity/Playwright here.
    // For now, we'll simulate getting AI responses based on top queries.
    const topQueries = job.topQueries?.map(q => q.query) || [`what is ${targetBrand}`];
    const aiResponses = await getAiResponsesForQueries(topQueries, job.url);

    // 2. SoGV and Citation Analysis
    const competitors = job.arkheReport.competitors.businessCompetitors.map(c => c.name);
    const { sogv, citation } = calculateSoGVMetrics(aiResponses, targetBrand, job.url, competitors);

    // 3. Sentiment Analysis
    const sentimentAnalysis = await analyzeSentiment(aiResponses);

    // 4. Accuracy and Hallucination (RAG)
    const claims = await extractClaimsFromResponses(aiResponses);
    const accuracyAndHallucination = await verifyClaimsWithRAG(claims, job.scrapedContent);

    const report: GenerativePerformanceReport = {
      shareOfGenerativeVoice: sogv,
      citationAnalysis: citation,
      sentimentAnalysis,
      accuracyAndHallucination,
    };

    logger.info(`Generative Performance analysis completed for job ${job.id}`, 'generative-performance-service');
    return report;
  } catch (error) {
    logger.error(`Generative Performance analysis failed for job ${job.id}`, 'generative-performance-service', { error });
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(ErrorType.ANALYSIS_FAILED, 'Generative Performance analysis failed.', { originalError: error });
  }
}
