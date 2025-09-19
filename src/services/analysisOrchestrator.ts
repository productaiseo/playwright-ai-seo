/* eslint-disable @typescript-eslint/no-explicit-any */
import { scrapWithPlaywright } from '@/utils/playwrightScraper';
import { runPerformanceAnalysis } from '@/services/performanceAnalyzer';
import { runArkheAnalysis } from '@/services/arkhe';
import { runPrometheusAnalysis } from '@/services/prometheus';
import { runLirAnalysis } from '@/services/lir';
import { runGenerativePerformanceAnalysis } from '@/services/generativePerformance';
import { generateEnhancedAnalysisReport } from '@/utils/gemini';
import { AnalysisJob } from '@/types/geo';
import logger from '@/utils/logger';
import { AppError, ErrorType } from '@/utils/errors';
import { updateJobInFirestore } from '@/lib/firebase-admin';
import { updateQueryStatus, saveReport, appendJobEvent } from '@/lib/database';

/**
 * Analiz işini günceller ve Firestore'a kaydeder.
 * @param job - Güncellenecek analiz işi.
 * @param updates - Uygulanacak güncellemeler.
 */
async function updateJob(job: AnalysisJob, updates: Partial<AnalysisJob>): Promise<AnalysisJob> {
  const updatesWithTimestamp = { ...updates, updatedAt: new Date().toISOString() };
  await updateJobInFirestore(job.id, updatesWithTimestamp);
  return { ...job, ...updatesWithTimestamp };
}

/**
 * Tüm analiz sürecini yönetir: Arkhe, Prometheus, Lir ve Generative Performance.
 * @param job - Başlatılacak analiz işi.
 */
export async function orchestrateAnalysis(job: AnalysisJob): Promise<void> {
  const { id, url } = job;
  logger.info(`[Orchestrator] Analiz süreci başlatıldı: ${id} - ${url}`, 'orchestrateAnalysis');

  try {
    // Update early so UI doesn't appear stuck at QUEUED
    job = await updateJob(job, { status: 'PROCESSING' });
    try { await appendJobEvent(id, { step: 'INIT', status: 'COMPLETED' }); } catch {}
    // 1. İçerik Tarama
    job = await updateJob(job, { status: 'PROCESSING_SCRAPE' });
    try { await appendJobEvent(id, { step: 'SCRAPE', status: 'STARTED' }); } catch {}
    const { content: scrapedContent, html: scrapedHtml } = await scrapWithPlaywright(url);
    job = await updateJob(job, { scrapedContent, scrapedHtml });
    try { await appendJobEvent(id, { step: 'SCRAPE', status: 'COMPLETED' }); } catch {}

    // 2. Performans Analizi
    job = await updateJob(job, { status: 'PROCESSING_PSI' });
    try { await appendJobEvent(id, { step: 'PSI', status: 'STARTED' }); } catch {}
    const performanceResult = await runPerformanceAnalysis(url);
    job = await updateJob(job, { performanceReport: performanceResult });
    try { await appendJobEvent(id, { step: 'PSI', status: 'COMPLETED' }); } catch {}

    // 3. Arkhe Analizi
    job = await updateJob(job, { status: 'PROCESSING_ARKHE' });
    const arkheAnalysisResult = await runArkheAnalysis(job);
    if ('error' in (arkheAnalysisResult as any)) {
      // Arkhe analizi kritik olduğu için hata durumunda süreci durdur
      throw new AppError(ErrorType.ANALYSIS_FAILED, `Arkhe analysis failed: ${(arkheAnalysisResult as any).error}`);
    }
    job = await updateJob(job, { arkheReport: arkheAnalysisResult as any });

    // 4. Prometheus Analizi
    job = await updateJob(job, { status: 'PROCESSING_PROMETHEUS' });
    const prometheusReport = await runPrometheusAnalysis(job);
    job = await updateJob(job, { prometheusReport });

    // 5. Lir Analizi (Delfi Gündemi)
    job = await updateJob(job, { status: 'PROCESSING_LIR' });
    const delfiAgenda = await runLirAnalysis(prometheusReport);
    job = await updateJob(job, { delfiAgenda });

    // 6. Generative Performance Analizi
    job = await updateJob(job, { status: 'PROCESSING_GENERATIVE_PERFORMANCE' });
    const targetBrand = job.arkheReport?.businessModel.brandName || new URL(job.url).hostname;
    const generativePerformanceReport = await runGenerativePerformanceAnalysis(job, targetBrand);
    job = await updateJob(job, { generativePerformanceReport });
    try { await appendJobEvent(id, { step: 'GEN_PERF', status: 'COMPLETED' }); } catch {}

    // Enhanced Analysis (narrative)
    try {
      try { await appendJobEvent(id, { step: 'ENHANCED', status: 'STARTED' }); } catch {}
      const analysisData: any = {
        domain: new URL(job.url).hostname,
        performanceReport: job.performanceReport,
        arkheReport: job.arkheReport,
        prometheusReport: job.prometheusReport,
        delfiAgenda: job.delfiAgenda,
        generativePerformanceReport: job.generativePerformanceReport,
        createdAt: job.createdAt,
      };
      const enhanced = await generateEnhancedAnalysisReport(analysisData);
      job = await updateJob(job, { ...(enhanced || {} as any) });
      try { await appendJobEvent(id, { step: 'ENHANCED', status: 'COMPLETED' }); } catch {}
    } catch (e) {
      logger.warn('Enhanced analysis failed; continuing without it', 'orchestrateAnalysis');
    }

    // 7. Süreci Tamamla
    const finalGeoScore = prometheusReport.overallGeoScore;
    await updateJob(job, { status: 'COMPLETED', finalGeoScore });

    // Postgres'teki sorgu durumunu güncelle ve raporu kaydet
    if (job.queryId) {
      await saveReport(job.queryId, job);
      await updateQueryStatus(job.queryId, 'COMPLETED');
    }

    logger.info(`[Orchestrator] Analiz süreci başarıyla tamamlandı: ${id}`, 'orchestrateAnalysis');

  } catch (error) {
    logger.error(`[Orchestrator] Analiz sürecinde hata oluştu: ${id}`, 'orchestrateAnalysis', { error });
    await updateJob(job, { status: 'FAILED', error: error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu.' });
    
    // Postgres'teki sorgu durumunu güncelle
    if (job.queryId) {
      await updateQueryStatus(job.queryId, 'FAILED');
    }
    
    if (error instanceof AppError) {
      throw error;
    }
    
    throw new AppError(
      ErrorType.ANALYSIS_FAILED,
      `Analiz orkestrasyonu başarısız oldu: ${id}`,
      { originalError: error }
    );
  }
}
import 'server-only';
