/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-require-imports */

import { PlaywrightScrapeResult } from '@/utils/types/analysis';
import { AppError, ErrorType } from '@/utils/errors';
import logger from '@/utils/logger';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

export async function scrapWithPlaywright(url: string): Promise<PlaywrightScrapeResult> {
  const normalizedUrl =
    url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;

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
      logger.info(
        `[playwright-scraper] attempt ${attempt}/${MAX_RETRIES} - ${normalizedUrl}`,
      );

      // --- Choose launch path
      let chromium: any;
      let launchOptions: any = { headless: true };

      if (isServerless) {
        // Serverless path: use sparticuz-chromium (Lambda-compatible)
        const sparticuzChromium = (await import('@sparticuz/chromium')).default;
        const { chromium: pwChromium } = await import('playwright-core');

        // smaller, stable config for serverless
        const executablePath = await sparticuzChromium.executablePath();
        chromium = pwChromium;
        launchOptions = {
          args: sparticuzChromium.args,
          executablePath,
          headless: true,
        };
      } else {
        // Local/dev path: vanilla playwright-core
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

      // Fetch robots.txt and llms.txt without navigating away from the page
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
        () => JSON.parse(JSON.stringify(window.performance))
      );

      logger.info(`[playwright-scraper] success - ${normalizedUrl}`);
      return { html, content, robotsTxt, llmsTxt, performanceMetrics };
    } catch (error: any) {
      lastError = error;
      logger.warn(
        `[playwright-scraper] attempt ${attempt}/${MAX_RETRIES} failed - ${normalizedUrl}`,
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
        await browser?.close();
      } catch {}
    }
  }

  throw new AppError(
    ErrorType.SCRAPING_ERROR,
    `Playwright ile sayfa taranırken ${MAX_RETRIES} denemenin ardından bir hata oluştu: ${normalizedUrl}`,
    {
      contextData: { url: normalizedUrl, error: lastError?.message },
      userFriendlyMessage:
        'Web sitesi taranırken bir sorunla karşılaşıldı. Lütfen URL\'yi kontrol edip tekrar deneyin.',
    }
  );
}

import 'server-only';
