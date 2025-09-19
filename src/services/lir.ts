import { AppError, ErrorType } from '@/utils/errors';
import logger from '@/utils/logger';
import { PrometheusReport, DelfiAgenda } from '@/types/geo';
import { generateDelfiAgenda } from '@/utils/aiAnalyzer';

export async function runLirAnalysis(prometheusReport: PrometheusReport): Promise<DelfiAgenda> {
  logger.info(`Starting Lir analysis`, 'lir-service');

  if (!prometheusReport) {
    throw new AppError(ErrorType.VALIDATION, 'Prometheus report is required for Lir analysis.');
  }

  try {
    const delfiAgendaResult = await generateDelfiAgenda(prometheusReport);

    if (delfiAgendaResult.errors.length > 0) {
      throw new AppError(ErrorType.ANALYSIS_FAILED, `Lir analysis encountered AI errors: ${delfiAgendaResult.errors.join(', ')}`);
    }

    logger.info(`Lir analysis completed`, 'lir-service');
    return delfiAgendaResult.combined;
  } catch (error) {
    logger.error(`Lir analysis failed`, 'lir-service', { error });
    throw new AppError(ErrorType.ANALYSIS_FAILED, 'Lir analysis failed.', { originalError: error });
  }
}
