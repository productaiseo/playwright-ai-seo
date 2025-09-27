/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-require-imports */

import { PlaywrightScrapeResult } from '@/utils/types/analysis';
import { AppError, ErrorType } from '@/utils/errors';
import logger from '@/utils/logger';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

// Dış scraper’ı çağır (Cloud Run). Başarısız olursa hata fırlatır.
async function fetchExternalScrape(normalizedUrl: string): Promise<PlaywrightScrapeResult> {
  const base = (process.env.SCRAPER_URL || '').trim();
  if (!base) {
    throw new Error('SCRAPER_URL not set');
  }

  const target = `${base.replace(/\/+$/, '')}/scrape`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 75_000); // 75sn timeout

  try {
    const resp = await fetch(target, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: normalizedUrl }),
      signal: ctrl.signal,
    });

    const data = await resp.json().catch(() => ({} as any));
    if (!resp.ok || data?.ok === false) {
      const msg = data?.error || `${resp.status} ${resp.statusText}`;
      throw new Error(`external scrape failed: ${msg}`);
    }

    // Dış API alanlarını dahili tipe normalize et
    const html = data.html ?? '';
    const content = data.content ?? data.text ?? '';
    const robotsTxt = data.robotsTxt ?? undefined;
    const llmsTxt = data.llmsTxt ?? undefined;

    // Dış serviste alan adı "performance" olabilir -> performanceMetrics'e eşle
    const performanceMetrics = data.performance ?? data.performanceMetrics ?? undefined;

    // Bazı alanlar kısa gelebilir (park sayfalar, JS bariyer), uyarı logla ama devam et
    if (!content || content.trim().length < 100) {
      logger.warn('[playwright-scraper] external content too short; continuing', 'playwright-scraper', {
        url: normalizedUrl,
        contentLength: (content || '').length,
      });
    }

    return { html, content, robotsTxt, llmsTxt, performanceMetrics };
  } finally {
    clearTimeout(t);
  }
}

export async function scrapWithPlaywright(url: string): Promise<PlaywrightScrapeResult> {
  const normalizedUrl =
    url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;

  // Önce dış scraper’ı dene (varsa)
  if ((process.env.SCRAPER_URL || '').trim()) {
    let lastErr: any;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        logger.info(`[playwright-scraper] external attempt ${attempt}/${MAX_RETRIES} - ${normalizedUrl}`);
        const res = await fetchExternalScrape(normalizedUrl);
        logger.info(`[playwright-scraper] external success - ${normalizedUrl}`);
        return res;
      } catch (e: any) {
        lastErr = e;
        logger.warn(
          `[playwright-scraper] external attempt ${attempt}/${MAX_RETRIES} failed - ${normalizedUrl}`,
          'playwright-scraper',
          { error: e?.message }
        );
        if (attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        }
      }
    }
    // Dış servis üst üste başarısızsa: local fallback
    logger.warn('[playwright-scraper] falling back to local Playwright', 'playwright-scraper', {
      url: normalizedUrl,
      error: (lastErr && lastErr.message) || 'unknown',
    });
  }

  // ====== MEVCUT LOCAL PLAYWRIGHT YOLU (fallback) ======
  const isServerless =
    !!process.env.VERCEL ||
    !!process.env.K_SERVICE ||
    !!process.env.FUNCTION_TARGET ||
    !!process.env.FIREBASE_CONFIG ||
    !!process.env.GCP_PROJECT;

  let lastError: any;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    let browser: any | null = null;

    try {
      logger.info(`[playwright-scraper] local attempt ${attempt}/${MAX_RETRIES} - ${normalizedUrl}`);

      // --- Launch path seçimi
      let chromium: any;
      let launchOptions: any = { headless: true };

      if (isServerless) {
        // Serverless path: sparticuz-chromium (Lambda-compatible)
        const sparticuzChromium = (await import('@sparticuz/chromium')).default;
        const { chromium: pwChromium } = await import('playwright-core');
        const executablePath = await sparticuzChromium.executablePath();

        chromium = pwChromium;
        launchOptions = {
          args: sparticuzChromium.args,
          executablePath,
          headless: true,
        };
      } else {
        // Local/dev path
        const { chromium: pwChromium } = await import('playwright-core');
        chromium = pwChromium;
        launchOptions = { headless: true };
      }

      browser = await chromium.launch(launchOptions);

      const context = await browser.newContext({
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
        locale: 'en-US',
      });

      const page = await context.newPage();

      const response = await page.goto(normalizedUrl, {
        waitUntil: 'load',
        timeout: 60_000,
      });

      if (!response || !response.ok()) {
        throw new AppError(
          ErrorType.SCRAPING_ERROR,
          `HTTP error! Status: ${response?.status()} for ${normalizedUrl}`,
          {
            userFriendlyMessage: `Web sitesine ulaşılamadı (Hata Kodu: ${response?.status()}). Lütfen URL'yi kontrol edin.`,
          }
        );
      }

      const html = await page.content();
      const content = await page.evaluate(() => document.body.innerText || '');

      if (!content || content.trim().length < 100) {
        throw new Error('Yetersiz içerik kazındı. Sayfa düzgün yüklenmemiş olabilir.');
      }

      // robots.txt ve llms.txt
      const [robotsTxt, llmsTxt] = await Promise.all([
        (async () => {
          try {
            const r = await page.request.get(new URL('/robots.txt', normalizedUrl).toString(), {
              timeout: 15_000,
            });
            return r.ok() ? await r.text() : undefined;
          } catch {
            logger.warn(`[playwright-scraper] robots.txt not reachable`);
            return undefined;
          }
        })(),
        (async () => {
          try {
            const r = await page.request.get(new URL('/llms.txt', normalizedUrl).toString(), {
              timeout: 15_000,
            });
            return r.ok() ? await r.text() : undefined;
          } catch {
            logger.warn(`[playwright-scraper] llms.txt not reachable`);
            return undefined;
          }
        })(),
      ]);

      const performanceMetrics = await page.evaluate(
        () => JSON.parse(JSON.stringify((window as any).performance))
      );

      logger.info(`[playwright-scraper] local success - ${normalizedUrl}`);
      return { html, content, robotsTxt, llmsTxt, performanceMetrics };
    } catch (error: any) {
      lastError = error;
      logger.warn(
        `[playwright-scraper] local attempt ${attempt}/${MAX_RETRIES} failed - ${normalizedUrl}`,
        'playwright-scraper',
        { error: error?.message }
      );

      if (error?.message?.includes('net::ERR_NAME_NOT_RESOLVED')) {
        throw new AppError(
          ErrorType.DNS_RESOLUTION_ERROR,
          `Alan adı çözümlenemedi: ${normalizedUrl}`,
          {
            contextData: { url: normalizedUrl, error: error.message },
            userFriendlyMessage:
              "Belirtilen alan adı bulunamadı. Lütfen URL'yi kontrol edip tekrar deneyin.",
          }
        );
      }

      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      }
    } finally {
      try {
        await (browser as any)?.close();
      } catch {}
    }
  }

  // Local da pes ettiyse
  throw new AppError(
    ErrorType.SCRAPING_ERROR,
    `Playwright ile sayfa taranırken ${MAX_RETRIES} denemenin ardından bir hata oluştu: ${normalizedUrl}`,
    {
      contextData: { url: normalizedUrl, error: (lastError && lastError.message) || 'unknown' },
      userFriendlyMessage:
        'Web sitesi taranırken bir sorunla karşılaşıldı. Lütfen URL\'yi kontrol edip tekrar deneyin.',
    }
  );
}

import 'server-only';
