/**
 * Firebase Functions (Gen2) – orchestrateAnalysis HTTP handler
 * Giriş, SCRAPER_URL fetch öncesi/sonrası ve hata anlarında
 * hem Cloud Logging'e log hem de Firestore'a event yazar.
 */

import { setGlobalOptions } from 'firebase-functions';
import { onRequest } from 'firebase-functions/https';
import * as logger from 'firebase-functions/logger';

import * as admin from 'firebase-admin';

setGlobalOptions({ maxInstances: 10 });

// Admin SDK init (idempotent)
try {
  admin.initializeApp();
} catch (_) {
  /* noop – already initialized */
}

const db = admin.firestore();

/** Firestore yardımcıları */
async function appendJobEvent(
  jobId: string,
  evt: { step: string; status: 'STARTED' | 'COMPLETED' | 'FAILED'; detail?: unknown }
) {
  const ts = new Date().toISOString();
  const ref = db.collection('analysisJobs').doc(jobId).collection('events').doc();
  await ref.set({ ts, ...evt });
}

async function updateJob(jobId: string, patch: Record<string, unknown>) {
  const ref = db.collection('analysisJobs').doc(jobId);
  await ref.set({ updatedAt: new Date().toISOString(), ...patch }, { merge: true });
}

/** Basit CORS */
function setCors(res: any) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
}

/** Sağlıklı mı diye minimal endpoint bırakmak istersen */
export const helloWorld = onRequest((req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  logger.info('Hello logs!', { structuredData: true });
  res.send('Hello from Firebase!');
});

/**
 * Orchestrator giriş noktası:
 * body: { jobId: string, userId?: string, domain?: string, url?: string }
 *
 * Davranış:
 * - INIT event
 * - SCRAPER_URL doğrulama (yoksa FAILED)
 * - SCRAPE START event
 * - POST ${SCRAPER_URL}/scrape { url }
 * - Sonuca göre SCRAPE COMPLETED/FAILED event
 * - Firestore'da job.status güncellemesi
 */
export const orchestrateAnalysis = onRequest(async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  try {
    const body = (req.body ?? {}) as {
      jobId?: string;
      userId?: string;
      domain?: string;
      url?: string;
    };

    const jobId = body.jobId || `job-${Date.now()}`;
    const rawUrl = body.url || (body.domain ? `https://${body.domain}` : undefined);

    logger.info('[orchestrateAnalysis] incoming request', {
      jobId,
      userId: body.userId || 'unknown',
      domain: body.domain || null,
      url: rawUrl || null,
    });

    if (!rawUrl) {
      const msg = 'Missing url/domain in request body';
      logger.error('[orchestrateAnalysis] bad request', { jobId, error: msg });
      await updateJob(jobId, { status: 'FAILED', error: msg });
      await appendJobEvent(jobId, { step: 'INIT', status: 'FAILED', detail: { error: msg } });
      return res.status(400).json({ ok: false, error: msg });
    }

    // INIT event
    await appendJobEvent(jobId, { step: 'INIT', status: 'COMPLETED' });
    await updateJob(jobId, {
      id: jobId,
      userId: body.userId || 'public',
      url: rawUrl,
      status: 'PROCESSING_SCRAPE',
    });

    // SCRAPER_URL kontrol
    const SCRAPER_URL = process.env.SCRAPER_URL?.trim();
    logger.info('[orchestrateAnalysis] env check', { jobId, SCRAPER_URL: SCRAPER_URL || null });

    if (!SCRAPER_URL) {
      const msg = 'SCRAPER_URL is not configured';
      await appendJobEvent(jobId, { step: 'SCRAPE', status: 'FAILED', detail: { error: msg } });
      await updateJob(jobId, { status: 'FAILED', error: msg });
      return res.status(500).json({ ok: false, error: msg });
    }

    // SCRAPE START
    await appendJobEvent(jobId, { step: 'SCRAPE', status: 'STARTED' });
    logger.info('[orchestrateAnalysis] calling scraper', { jobId, target: rawUrl });

    let scrapeRespOk = false;
    let scrapeJson: any = null;
    try {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 120_000);

      const resp = await fetch(`${SCRAPER_URL}/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: rawUrl }),
        signal: ctrl.signal,
      });

      clearTimeout(timeout);
      scrapeJson = await resp.json().catch(() => ({}));
      scrapeRespOk = resp.ok && !!scrapeJson?.ok;

      logger.info('[orchestrateAnalysis] scraper response', {
        jobId,
        httpStatus: resp.status,
        ok: scrapeJson?.ok ?? false,
        lengths: scrapeJson?.lengths ?? null,
      });
    } catch (e: any) {
      logger.error('[orchestrateAnalysis] scraper fetch error', {
        jobId,
        error: e?.message || String(e),
      });
    }

    if (scrapeRespOk) {
      // SCRAPE COMPLETED
      await appendJobEvent(jobId, {
        step: 'SCRAPE',
        status: 'COMPLETED',
        detail: {
          via: 'cloud-run',
          lengths: scrapeJson?.lengths ?? null,
        },
      });

      await updateJob(jobId, {
        scrapedHtml: String(scrapeJson?.html || ''),
        scrapedContent: String(scrapeJson?.content || ''),
        scrapeMeta: {
          robotsTxt: typeof scrapeJson?.robotsTxt === 'string' ? scrapeJson.robotsTxt : undefined,
          llmsTxt: typeof scrapeJson?.llmsTxt === 'string' ? scrapeJson.llmsTxt : undefined,
          performance: scrapeJson?.performance ?? undefined,
          via: 'cloud-run',
        },
        status: 'PROCESSING_PSI', // Bir sonraki adımı göstermek için
      });

      // Orkestrasyonun geri kalanı burada (PSI/ARKHE/…) tetiklenebilir.
      // Bu örnekte yalnızca scraping’i "kanıt" amaçlı gösteriyoruz.
      return res.status(202).json({
        ok: true,
        jobId,
        step: 'SCRAPE',
        next: 'PSI',
        lengths: scrapeJson?.lengths ?? null,
      });
    } else {
      // SCRAPE FAILED
      const errMsg =
        (scrapeJson?.error as string) ||
        'scraper did not return ok:true';

      await appendJobEvent(jobId, {
        step: 'SCRAPE',
        status: 'FAILED',
        detail: { error: errMsg },
      });
      await updateJob(jobId, {
        status: 'FAILED',
        error: `scrape_failed: ${errMsg}`,
      });

      return res.status(502).json({
        ok: false,
        jobId,
        error: `scrape_failed: ${errMsg}`,
      });
    }
  } catch (err: any) {
    logger.error('[orchestrateAnalysis] unhandled error', {
      error: err?.message || String(err),
      stack: err?.stack,
    });
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
});
