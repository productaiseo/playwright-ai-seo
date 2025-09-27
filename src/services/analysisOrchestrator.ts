// src/services/analysisOrchestrator.ts
/* eslint-disable @typescript-eslint/no-explicit-any */

import { scrapWithPlaywright } from '@/utils/playwrightScraper';
import { runPerformanceAnalysis } from '@/services/performanceAnalyzer';
import { runArkheAnalysis } from '@/services/arkhe';
import { runPrometheusAnalysis } from '@/services/prometheus';
import { runLirAnalysis } from '@/services/lir';
import { runGenerativePerformanceAnalysis } from '@/services/generativePerformance';
import { generateEnhancedAnalysisReport } from '@/utils/gemini';
import { AnalysisJob, ScrapeMeta } from '@/types/geo';
import logger from '@/utils/logger';
import { AppError, ErrorType } from '@/utils/errors';
import { updateJobInFirestore } from '@/lib/firebase-admin';
import { updateQueryStatus, saveReport, appendJobEvent } from '@/lib/database';

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function normalizeUrl(input: string): string {
  try {
    const withProto = input.startsWith('http') ? input : `https://${input}`;
    return new URL(withProto).toString();
  } catch {
    return input;
  }
}

async function updateJob(
  job: AnalysisJob,
  updates: Partial<AnalysisJob>
): Promise<AnalysisJob> {
  const updatesWithTimestamp = { ...updates, updatedAt: new Date().toISOString() };
  await updateJobInFirestore(job.id, updatesWithTimestamp);
  return { ...job, ...updatesWithTimestamp };
}

/**
 * Varsa Cloud Run Scraper’ı kullanır; hata veya başarısız yanıtta
 * lokal Playwright’a düşer. Başarılı sonuçta via = 'cloud-run' | 'playwright'.
 */
async function tryScrape(url: string): Promise<{
  html: string;
  content: string;
  robotsTxt?: string;
  llmsTxt?: string;
  performance?: unknown;
  via: 'cloud-run' | 'playwright';
}> {
  const target = normalizeUrl(url);
  const cloudRun = process.env.SCRAPER_URL?.trim();

  // 1) Cloud Run Scraper (varsa)
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

      const json = (await resp.json().catch(() => ({}))) as Record<string, unknown>;
      const ok = Boolean(json?.ok);

      if (resp.ok && ok) {
        const html = String((json as { html?: unknown }).html ?? '');
        const content = String((json as { content?: unknown }).content ?? '');
        const robotsTxt =
          typeof (json as { robotsTxt?: unknown }).robotsTxt === 'string'
            ? ((json as { robotsTxt?: string }).robotsTxt)
            : undefined;
        const llmsTxt =
          typeof (json as { llmsTxt?: unknown }).llmsTxt === 'string'
            ? ((json as { llmsTxt?: string }).llmsTxt)
            : undefined;
        const performance = (json as { performance?: unknown }).performance;

        return { html, content, robotsTxt, llmsTxt, performance, via: 'cloud-run' };
      }

      // HTTP geldi ama beklenen gövde değil
      const msg = (json as { error?: unknown }).error;
      throw new Error(
        typeof msg === 'string'
          ? msg
          : `cloud-scraper-bad-response: ${resp.status} ${resp.statusText}`
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : 'unknown';
      logger.warn(
        `[Orchestrator] Cloud Run scraper failed, fallback to Playwright`,
        'orchestrateAnalysis',
        { error: message }
      );
    }
  }

  // 2) Lokal Playwright (fallback)
  const r = await scrapWithPlaywright(target);
  return {
    html: r.html,
    content: r.content,
    robotsTxt: r.robotsTxt,
    llmsTxt: r.llmsTxt,
    performance: r.performanceMetrics,
    via: 'playwright',
  };
}

/* ------------------------------------------------------------------ */
/* Main Orchestrator                                                  */
/* ------------------------------------------------------------------ */

export async function orchestrateAnalysis(job: AnalysisJob): Promise<void> {
  const { id, url } = job;
  logger.info(`[Orchestrator] Start: ${id} - ${url}`, 'orchestrateAnalysis');

  try {
    /* 0) INIT -> PROCESSING */
    job = await updateJob(job, { status: 'PROCESSING' });
    try {
      await appendJobEvent(id, { step: 'INIT', status: 'COMPLETED' });
    } catch {
      /* noop */
    }

    /* 1) SCRAPE */
    job = await updateJob(job, { status: 'PROCESSING_SCRAPE' });
    try {
      await appendJobEvent(id, { step: 'SCRAPE', status: 'STARTED' });
    } catch {
      /* noop */
    }

    try {
      const scrape = await tryScrape(url);

      // Minimal garanti alanı (html + content)
      const scrapeUpdates: Partial<AnalysisJob> = {
        scrapedContent: scrape.content,
        scrapedHtml: scrape.html,
      };

      // Opsiyonel meta
      const meta: ScrapeMeta = {
        robotsTxt: scrape.robotsTxt,
        llmsTxt: scrape.llmsTxt,
        performance: scrape.performance,
        via: scrape.via,
      };
      // Typesafe alan: AnalysisJob içine scrapeMeta eklendiyse set et
      (scrapeUpdates as { scrapeMeta?: ScrapeMeta }).scrapeMeta = meta;

      job = await updateJob(job, scrapeUpdates);

      try {
        await appendJobEvent(id, { step: 'SCRAPE', status: 'COMPLETED' });
      } catch {
        /* noop */
      }
    } catch (scrapeErr) {
      const msg =
        scrapeErr instanceof Error ? scrapeErr.message : 'scrape failed (unknown error)';

      await updateJob(job, { status: 'FAILED', error: `scrape_failed: ${msg}` });
      try {
        await appendJobEvent(id, {
          step: 'SCRAPE',
          status: 'FAILED',
          detail: { error: msg },
        });
      } catch {
        /* noop */
      }
      // SCRAPE kritik; akışı burada kesiyoruz
      return;
    }

    /* 2) PSI */
    job = await updateJob(job, { status: 'PROCESSING_PSI' });
    try {
      await appendJobEvent(id, { step: 'PSI', status: 'STARTED' });
    } catch {
      /* noop */
    }

    const performanceResult = await runPerformanceAnalysis(url);
    job = await updateJob(job, { performanceReport: performanceResult });
    try {
      await appendJobEvent(id, { step: 'PSI', status: 'COMPLETED' });
    } catch {
      /* noop */
    }

    /* 3) ARKHE */
    job = await updateJob(job, { status: 'PROCESSING_ARKHE' });
    const arkheAnalysisResult = await runArkheAnalysis(job);
    if ((arkheAnalysisResult as { error?: unknown })?.error) {
      throw new AppError(
        ErrorType.ANALYSIS_FAILED,
        `Arkhe analysis failed: ${(arkheAnalysisResult as { error?: unknown }).error as string}`
      );
    }
    job = await updateJob(job, { arkheReport: arkheAnalysisResult as unknown });

    /* 4) PROMETHEUS */
    job = await updateJob(job, { status: 'PROCESSING_PROMETHEUS' });
    const prometheusReport = await runPrometheusAnalysis(job);
    job = await updateJob(job, { prometheusReport });

    /* 5) LIR (Delfi) */
    job = await updateJob(job, { status: 'PROCESSING_LIR' });
    const delfiAgenda = await runLirAnalysis(prometheusReport);
    job = await updateJob(job, { delfiAgenda });

    /* 6) Generative Performance */
    job = await updateJob(job, { status: 'PROCESSING_GENERATIVE_PERFORMANCE' });
    const targetBrand =
      job.arkheReport?.businessModel?.brandName || new URL(job.url).hostname;
    const genPerf = await runGenerativePerformanceAnalysis(job, targetBrand);
    job = await updateJob(job, { generativePerformanceReport: genPerf });
    try {
      await appendJobEvent(id, { step: 'GEN_PERF', status: 'COMPLETED' });
    } catch {
      /* noop */
    }

    /* 7) Narrative / Enhanced (opsiyonel) */
    try {
      try {
        await appendJobEvent(id, { step: 'ENHANCED', status: 'STARTED' });
      } catch {
        /* noop */
      }

      const enhancedInput = {
        domain: new URL(job.url).hostname,
        performanceReport: job.performanceReport,
        arkheReport: job.arkheReport,
        prometheusReport: job.prometheusReport,
        delfiAgenda: job.delfiAgenda,
        generativePerformanceReport: job.generativePerformanceReport,
        createdAt: job.createdAt,
      };

      const enhanced = await generateEnhancedAnalysisReport(enhancedInput);
      if (enhanced) {
        // enhanced tipi dinamik olabilir; güvenli şekilde yay
        job = await updateJob(job, { ...(enhanced as Record<string, unknown>) });
      }

      try {
        await appendJobEvent(id, { step: 'ENHANCED', status: 'COMPLETED' });
      } catch {
        /* noop */
      }
    } catch {
      logger.warn('Enhanced analysis failed; continuing', 'orchestrateAnalysis');
    }

    /* 8) Complete */
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
