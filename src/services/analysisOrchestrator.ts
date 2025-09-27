// src/services/analysisOrchestrator.ts

/* eslint-disable @typescript-eslint/no-explicit-any */

import { scrapWithPlaywright } from '@/utils/playwrightScraper';
import { runPerformanceAnalysis } from '@/services/performanceAnalyzer';
import { runArkheAnalysis } from '@/services/arkhe';
import { runPrometheusAnalysis } from '@/services/prometheus';
import { runLirAnalysis } from '@/services/lir';
import { runGenerativePerformanceAnalysis } from '@/services/generativePerformance';
import { generateEnhancedAnalysisReport } from '@/utils/gemini';

import {
  AnalysisJob,
  ScrapeMeta,
  PerformanceMetrics,
  PrometheusReport,
} from '@/types/geo';

import logger from '@/utils/logger';
import { AppError, ErrorType } from '@/utils/errors';
import { updateJobInFirestore } from '@/lib/firebase-admin';
import { updateQueryStatus, saveReport, appendJobEvent } from '@/lib/database';

/* ------------------------------ helpers ------------------------------ */

function normalizeUrl(u: string): string {
  try {
    const withProto = u.startsWith('http') ? u : `https://${u}`;
    return new URL(withProto).toString();
  } catch {
    return u;
  }
}

async function updateJob(job: AnalysisJob, updates: Partial<AnalysisJob>): Promise<AnalysisJob> {
  const updatesWithTimestamp = { ...updates, updatedAt: new Date().toISOString() };
  await updateJobInFirestore(job.id, updatesWithTimestamp);
  return { ...job, ...updatesWithTimestamp };
}

/**
 * Cloud Run scraper varsa önce onu dener; hata olursa lokal Playwright’a düşer.
 * Başarıda { html, content, robotsTxt, llmsTxt, performance, via } döner.
 */
async function tryScrape(url: string): Promise<{
  html: string;
  content: string;
  robotsTxt?: string;
  llmsTxt?: string;
  performance?: PerformanceMetrics;
  via: 'cloud-run' | 'playwright';
}> {
  const target = normalizeUrl(url);
  const cloudRun = process.env.SCRAPER_URL?.trim();
  const forceExternalScraper = ['1', 'true', 'yes', 'on'].includes(
    String(process.env.FORCE_EXTERNAL_SCRAPER ?? '').toLowerCase()
  );
  let cloudRunError: unknown;

  // 1) Cloud Run Scraper
  if (cloudRun) {
    try {
      const controller = new AbortController();
      const to = setTimeout(() => controller.abort(), 120_000);

      const resp = await fetch(`${cloudRun}/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: target }),
        signal: controller.signal,
      });

      clearTimeout(to);

      const json: any = await resp.json().catch(() => ({}));
      if (resp.ok && json?.ok) {
        const perf: PerformanceMetrics | undefined = json?.performance
          ? {
              timeOrigin: json.performance.timeOrigin,
              timing: json.performance.timing,
              navigation: json.performance.navigation,
            }
          : undefined;

        return {
          html: String(json.html ?? ''),
          content: String(json.content ?? ''),
          robotsTxt: typeof json.robotsTxt === 'string' ? json.robotsTxt : undefined,
          llmsTxt: typeof json.llmsTxt === 'string' ? json.llmsTxt : undefined,
          performance: perf,
          via: 'cloud-run',
        };
      }

      // HTTP geldi ama icerik uygun degil
      throw new Error(json?.error || `cloud-scraper-bad-response: ${resp.status} ${resp.statusText}`);
    } catch (e: any) {
      cloudRunError = e;
      const warnMsg = forceExternalScraper
        ? '[Orchestrator] Cloud Run scraper failed and FORCE_EXTERNAL_SCRAPER is set; skipping local fallback'
        : '[Orchestrator] Cloud Run scraper failed, falling back to Playwright';
      logger.warn(warnMsg, 'orchestrateAnalysis', { error: e?.message });
    }
  } else if (forceExternalScraper) {
    throw new AppError(
      ErrorType.CONFIGURATION,
      'FORCE_EXTERNAL_SCRAPER is true but SCRAPER_URL is not configured',
      { contextData: { url: target } }
    );
  }

  if (forceExternalScraper) {
    throw new AppError(
      ErrorType.SCRAPING_ERROR,
      'Cloud Run scraper failed and local fallback is disabled via FORCE_EXTERNAL_SCRAPER.',
      {
        contextData: { url: target },
        originalError: cloudRunError instanceof Error ? cloudRunError : undefined,
      }
    );
  }

  // 2) Lokal Playwright (fallback)
  const r = await scrapWithPlaywright(target);
  const perfFallback: PerformanceMetrics | undefined = r.performanceMetrics
    ? {
        timeOrigin: r.performanceMetrics.timeOrigin,
        timing: r.performanceMetrics.timing,
        navigation: r.performanceMetrics.navigation,
      }
    : undefined;

  return {
    html: r.html,
    content: r.content,
    robotsTxt: r.robotsTxt,
    llmsTxt: r.llmsTxt,
    performance: perfFallback,
    via: 'playwright',
  };
}
/* --------------------------- main orchestrator --------------------------- */

export async function orchestrateAnalysis(job: AnalysisJob): Promise<void> {
  const { id, url } = job;
  logger.info(`[Orchestrator] Start: ${id} - ${url}`, 'orchestrateAnalysis');

  try {
    // 0) INIT -> PROCESSING
    job = await updateJob(job, { status: 'PROCESSING' });
    try { await appendJobEvent(id, { step: 'INIT', status: 'COMPLETED' }); } catch {}

    // 1) SCRAPE
    job = await updateJob(job, { status: 'PROCESSING_SCRAPE' });
    try { await appendJobEvent(id, { step: 'SCRAPE', status: 'STARTED' }); } catch {}

    try {
      const scrape = await tryScrape(url);

      const meta: ScrapeMeta = {
        robotsTxt: scrape.robotsTxt,
        llmsTxt: scrape.llmsTxt,
        performance: scrape.performance,
        via: scrape.via,
      };

      job = await updateJob(job, {
        scrapedContent: scrape.content,
        scrapedHtml: scrape.html,
        scrapeMeta: meta,
      });

      try { await appendJobEvent(id, { step: 'SCRAPE', status: 'COMPLETED' }); } catch {}

    } catch (scrapeErr: any) {
      const msg =
        (scrapeErr?.message as string) ||
        (typeof scrapeErr === 'string' ? scrapeErr : 'scrape failed');

      // Firestore’da hem status’u hem hatayı netleştiriyoruz
      await updateJob(job, {
        status: 'FAILED',
        error: `scrape_failed: ${msg}`,
      });

      try {
        await appendJobEvent(id, {
          step: 'SCRAPE',
          status: 'FAILED',
          detail: { error: msg },
        });
      } catch {}

      // Scrape yoksa devam etmenin anlamı yok; erken dön.
      return;
    }

    // 2) PSI
    job = await updateJob(job, { status: 'PROCESSING_PSI' });
    try { await appendJobEvent(id, { step: 'PSI', status: 'STARTED' }); } catch {}

    const performanceResult = await runPerformanceAnalysis(url);
    job = await updateJob(job, { performanceReport: performanceResult });

    try { await appendJobEvent(id, { step: 'PSI', status: 'COMPLETED' }); } catch {}

    // 3) ARKHE
    job = await updateJob(job, { status: 'PROCESSING_ARKHE' });
    const arkheAnalysisResult = await runArkheAnalysis(job);
    if ((arkheAnalysisResult as any)?.error) {
      throw new AppError(
        ErrorType.ANALYSIS_FAILED,
        `Arkhe analysis failed: ${(arkheAnalysisResult as any).error}`
      );
    }
    job = await updateJob(job, { arkheReport: arkheAnalysisResult as any });

    // 4) PROMETHEUS
    job = await updateJob(job, { status: 'PROCESSING_PROMETHEUS' });
    const prometheusReport: PrometheusReport = await runPrometheusAnalysis(job);
    job = await updateJob(job, { prometheusReport });

    // 5) LIR (Delfi)
    job = await updateJob(job, { status: 'PROCESSING_LIR' });
    const delfiAgenda = await runLirAnalysis(prometheusReport);
    job = await updateJob(job, { delfiAgenda });

    // 6) Generative Performance
    job = await updateJob(job, { status: 'PROCESSING_GENERATIVE_PERFORMANCE' });
    const targetBrand =
      job.arkheReport?.businessModel?.brandName || new URL(job.url).hostname;
    const genPerf = await runGenerativePerformanceAnalysis(job, targetBrand);
    job = await updateJob(job, { generativePerformanceReport: genPerf });
    try { await appendJobEvent(id, { step: 'GEN_PERF', status: 'COMPLETED' }); } catch {}

    // 7) Narrative / Enhanced (opsiyonel)
    try {
      try { await appendJobEvent(id, { step: 'ENHANCED', status: 'STARTED' }); } catch {}

      const enhanced = await generateEnhancedAnalysisReport({
        domain: new URL(job.url).hostname,
        performanceReport: job.performanceReport,
        arkheReport: job.arkheReport,
        prometheusReport: job.prometheusReport,
        delfiAgenda: job.delfiAgenda,
        generativePerformanceReport: job.generativePerformanceReport,
        createdAt: job.createdAt,
      });

      if (enhanced) {
        job = await updateJob(job, { ...(enhanced as any) });
      }

      try { await appendJobEvent(id, { step: 'ENHANCED', status: 'COMPLETED' }); } catch {}
    } catch {
      logger.warn('Enhanced analysis failed; continuing', 'orchestrateAnalysis');
    }

    // 8) Tamamla
    const finalGeoScore = prometheusReport.overallGeoScore;
    await updateJob(job, { status: 'COMPLETED', finalGeoScore });

    if (job.queryId) {
      await saveReport(job.queryId, job);
      await updateQueryStatus(job.queryId, 'COMPLETED');
    }

    logger.info(`[Orchestrator] Done: ${id}`, 'orchestrateAnalysis');

  } catch (error) {
    logger.error(`[Orchestrator] Error: ${id}`, 'orchestrateAnalysis', { error });

    await updateJob(job, {
      status: 'FAILED',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    if (job.queryId) {
      await updateQueryStatus(job.queryId, 'FAILED');
    }

    if (error instanceof AppError) throw error;

    throw new AppError(
      ErrorType.ANALYSIS_FAILED,
      `Analiz orkestrasyonu başarısız oldu: ${id}`,
      { originalError: error }
    );
  }
}

import 'server-only';
