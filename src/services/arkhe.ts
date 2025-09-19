/* eslint-disable @typescript-eslint/no-unused-vars */
import { AppError, ErrorType } from '@/utils/errors';
import logger from '@/utils/logger';
import { AnalysisJob, ArkheReport } from '@/types/geo';
import { handleServiceError } from '@/utils/errorHandlers';
import { scrapWithPlaywright } from '@/utils/playwrightScraper';
import { analyzeBusinessModel, analyzeTargetAudience, analyzeCompetitors } from '@/utils/aiAnalyzer';
// import { PlaywrightScrapeResult } from '@/utils/types/analysis';

export async function runArkheAnalysis(job: AnalysisJob): Promise<ArkheReport | { error: string }> {
  logger.info(`Starting Arkhe analysis for job ${job.id}`, 'arkhe-service', { url: job.url });

  try {
    const { html, content, robotsTxt, llmsTxt } = await scrapWithPlaywright(job.url);

    if (!content || content.trim().length < 100) {
      throw new AppError(ErrorType.VALIDATION, 'Scraped content is insufficient for Arkhe analysis.');
    }

    const [businessModelResult, targetAudienceResult, competitorsResult] = await Promise.all([
      analyzeBusinessModel(content),
      analyzeTargetAudience(content),
      analyzeCompetitors(content, job.url)
    ]);

    // Hata kontrolü
    const errors = [
      ...businessModelResult.errors,
      ...targetAudienceResult.errors,
      ...competitorsResult.errors,
    ];

    if (errors.length > 0) {
      throw new AppError(ErrorType.ANALYSIS_FAILED, `Arkhe analysis encountered AI errors: ${errors.join(', ')}`);
    }

    const report: ArkheReport = {
      businessModel: businessModelResult.combined,
      targetAudience: targetAudienceResult.combined,
      competitors: competitorsResult.combined,
    };

    // Rakip analizi için şimdilik bir şey yapmıyoruz, bu daha sonraki bir adımda ele alınacak.

    logger.info(`Arkhe analysis completed for job ${job.id}`, 'arkhe-service');
    return report;
  } catch (error) {
    return handleServiceError(error, 'arkhe.runArkheAnalysis');
  }
}
import 'server-only';
