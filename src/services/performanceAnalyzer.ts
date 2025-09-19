/* eslint-disable @typescript-eslint/no-explicit-any */
// app/services/performanceAnalyzer.ts

import {
  PerformanceAnalysis,
  PerformanceRating,
  CruxMetrics,
  LighthouseMetrics,
} from '@/types/analysis';
import { AppError, ErrorType } from '@/utils/errors';
import logger from '@/utils/logger';
import { cacheGet, cacheSet } from '@/lib/cache';

/**
 * PageSpeed Insights uç noktası için URL oluşturur
 */
function buildPsiUrl(url: string, apiKey: string): string {
  const base = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
  const params = new URLSearchParams({
    url,
    category: 'PERFORMANCE',
    strategy: 'MOBILE',
    key: apiKey,
  });
  return `${base}?${params.toString()}`;
}

/**
 * Google PageSpeed Insights API'sinden gelen metriklere göre bir derecelendirme atar.
 * Eşikler, Google'ın resmi belgelerine dayanmaktadır.
 */
function getRating(metricName: keyof CruxMetrics | keyof LighthouseMetrics, value: number): PerformanceRating {
  const thresholds: Record<string, { good: number; poor: number }> = {
    lcp: { good: 2500, poor: 4000 }, // ms
    inp: { good: 200, poor: 500 }, // ms
    cls: { good: 0.1, poor: 0.25 }, // unitless
    fcp: { good: 1800, poor: 3000 }, // ms
    ttfb: { good: 800, poor: 1800 }, // ms
    speedIndex: { good: 3400, poor: 5800 }, // ms
    totalBlockingTime: { good: 200, poor: 600 }, // ms
    timeToInteractive: { good: 3800, poor: 7300 }, // ms
  };

  const metricThresholds = thresholds[metricName as string];
  if (!metricThresholds) return 'NEEDS_IMPROVEMENT';

  if (value <= metricThresholds.good) return 'GOOD';
  if (value > metricThresholds.poor) return 'POOR';
  return 'NEEDS_IMPROVEMENT';
}

/**
 * API yanıtından CrUX (Alan Verileri) verilerini işler.
 */
function processCruxData(apiResponse: any): { metrics: CruxMetrics; overallRating: PerformanceRating } | null {
  const record = apiResponse?.loadingExperience;
  if (!record || !record.metrics) {
    logger.info('CrUX verisi bulunamadı.', 'performanceAnalyzer.processCruxData');
    return null;
  }

  const metrics: Partial<CruxMetrics> = {};
  const metricMapping: Record<string, keyof CruxMetrics> = {
    'LARGEST_CONTENTFUL_PAINT_MS': 'lcp',
    'INTERACTION_TO_NEXT_PAINT': 'inp',
    'CUMULATIVE_LAYOUT_SHIFT_SCORE': 'cls',
    'FIRST_CONTENTFUL_PAINT_MS': 'fcp',
    'FIRST_INPUT_DELAY_MS': 'ttfb', // TTFB için FID kullanılıyor, en yakın proxy
  };

  for (const key in record.metrics) {
    const metricKey = metricMapping[key];
    if (metricKey) {
      const value = parseFloat(record.metrics[key].percentiles.p75);
      metrics[metricKey] = {
        value,
        rating: getRating(metricKey, value),
      };
    }
  }

  if (!metrics.lcp || !metrics.inp || !metrics.cls) {
    logger.warn('Temel CrUX metrikleri (LCP, INP, CLS) eksik.', 'performanceAnalyzer.processCruxData', metrics);
    return null;
  }

  return {
    metrics: metrics as CruxMetrics,
    overallRating: record.overall_category as PerformanceRating,
  };
}

/**
 * API yanıtından Lighthouse (Laboratuvar Verileri) verilerini işler.
 */
function processLighthouseData(apiResponse: any): { metrics: LighthouseMetrics; overallScore: number } {
  const lighthouse = apiResponse?.lighthouseResult;
  if (!lighthouse || !lighthouse.audits) {
    throw new AppError(ErrorType.API_ERROR, 'Lighthouse verisi bulunamadı veya geçersiz.', {
      contextData: { apiResponse },
    });
  }

  const audits = lighthouse.audits;
  const getAuditValue = (id: string): number => audits[id]?.numericValue || 0;

  const metrics: LighthouseMetrics = {
    lcp: { value: getAuditValue('largest-contentful-paint'), rating: getRating('lcp', getAuditValue('largest-contentful-paint')) },
    cls: { value: getAuditValue('cumulative-layout-shift'), rating: getRating('cls', getAuditValue('cumulative-layout-shift')) },
    fcp: { value: getAuditValue('first-contentful-paint'), rating: getRating('fcp', getAuditValue('first-contentful-paint')) },
    speedIndex: { value: getAuditValue('speed-index'), rating: getRating('speedIndex', getAuditValue('speed-index')) },
    totalBlockingTime: { value: getAuditValue('total-blocking-time'), rating: getRating('totalBlockingTime', getAuditValue('total-blocking-time')) },
    timeToInteractive: { value: getAuditValue('interactive'), rating: getRating('timeToInteractive', getAuditValue('interactive')) },
  };

  const overallScore = (lighthouse.categories.performance.score || 0) * 100;

  return { metrics, overallScore };
}

/**
 * Belirtilen URL için Google PageSpeed Insights analizini çalıştırır.
 */
export async function runPerformanceAnalysis(url: string): Promise<PerformanceAnalysis> {
  logger.info(`PageSpeed Insights analizi başlatılıyor: ${url}`, 'performanceAnalyzer.run');

  const apiKey = process.env.GOOGLE_PAGESPEED_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    // Testlerin beklediği (dosyadaki) metin ile birebir uyuşması için mevcut encoding ile bırakıldı
    throw new AppError(
      ErrorType.CONFIGURATION,
      'GOOGLE_PAGESPEED_API_KEY çevre değişkeni ayarlanmamış.'
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);

  try {
    // Firestore cache kontrolü (varsa 24 saatlik)
    try {
      const cacheKey = `psi:v5:MOBILE:PERFORMANCE:${encodeURI(url)}`;
      const cached = await cacheGet<PerformanceAnalysis>(cacheKey);
      if (cached) {
        clearTimeout(timeoutId);
        return cached;
      }
    } catch {}

    const psiUrl = buildPsiUrl(encodeURI(url), apiKey);
    const res: any = await fetch(psiUrl, { signal: controller.signal } as any);
    if (!res || typeof res !== 'object') {
      throw new AppError(ErrorType.API_ERROR, 'PageSpeed API Error: Empty response');
    }
    clearTimeout(timeoutId);

    if (!res.ok) {
      let details: any = undefined;
      try { details = await res.json(); } catch {}
      const message = details?.error?.message || `${res.status} ${res.statusText}`;
      throw new AppError(ErrorType.API_ERROR, `PageSpeed API Error: ${message}`, { contextData: details });
    }

    const data = await res.json();

    const cruxResult = processCruxData(data);
    const lighthouseResult = processLighthouseData(data);

    const performanceReport: PerformanceAnalysis = {
      url,
      hasCruxData: !!cruxResult,
      crux: cruxResult
        ? { overallRating: cruxResult.overallRating, metrics: cruxResult.metrics }
        : undefined,
      lighthouse: {
        overallScore: lighthouseResult.overallScore,
        metrics: lighthouseResult.metrics,
      },
    };

    logger.info(
      `PageSpeed Insights analizi tamamlandı: ${url}`,
      'performanceAnalyzer.run',
      JSON.stringify({ hasCrux: performanceReport.hasCruxData })
    );

    try {
      const cacheKey = `psi:v5:MOBILE:PERFORMANCE:${encodeURI(url)}`;
      await cacheSet(cacheKey, performanceReport, 24 * 60 * 60);
    } catch {}

    return performanceReport;
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new AppError(ErrorType.API_ERROR, 'PageSpeed API request timed out after 45 seconds');
    }
    if (error instanceof AppError) throw error;
    throw new AppError(ErrorType.UNKNOWN, error?.message || 'Bilinmeyen hata', { originalError: error });
  }
}
import 'server-only';
