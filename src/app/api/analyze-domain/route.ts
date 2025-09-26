/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import {
  createJobInFirestore,
  updateJobInFirestore,
  getJobFromFirestore,
} from '@/lib/firebase-admin';
import { AnalysisJob } from '@/types/geo';

/** ENV’leri üstte sabitle */
const PUBLIC_ANALYZE_URL     = (process.env.ANALYZE_PUBLIC_URL ?? '').trim();
const INTERNAL_API_URL_ENV   = (process.env.INTERNAL_API_URL ?? '').trim();
const INTERNAL_API_TOKEN_ENV = (process.env.INTERNAL_API_TOKEN ?? '').trim();

export async function POST(request: NextRequest) {
  try {
    const payloadJson = await request.json();
    const url: string | undefined = payloadJson?.url;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL gereklidir ve bir metin olmalidir.' },
        { status: 400 }
      );
    }

    const normalizedUrl =
      url.startsWith('http://') || url.startsWith('https://')
        ? url
        : `https://${url}`;

    /**
     * 1) ÖNCE PUBLIC PROXY: varsa direkt oraya POST et, çıktıyı aynen dön.
     * Vercel prod’da ANALYZE_PUBLIC_URL = analyzedomainpublic-*.run.app olmalı.
     */
    const publicOk = (() => {
      if (!PUBLIC_ANALYZE_URL) return false;
      try {
        const u = new URL(PUBLIC_ANALYZE_URL);
        return !/[<>]/.test(u.href);
      } catch {
        return false;
      }
    })();

    if (publicOk) {
      try {
        const proxyResp = await fetch(PUBLIC_ANALYZE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: normalizedUrl,
            userId: 'public', // gerekirse gerçek uid gönder
          }),
        });
        const proxyJson = await proxyResp.json().catch(() => ({}));
        return NextResponse.json(proxyJson, { status: proxyResp.status });
      } catch {
        // public proxy hata verirse internal akışa düş (fallback)
      }
    }

    /**
     * 2) INTERNAL AKIŞ: job’ı oluştur, internal enqueue et.
     */
    const nowIso = new Date().toISOString();
    const jobId = uuidv4();

    const newJob: AnalysisJob = {
      id: jobId,
      url: normalizedUrl,
      status: 'QUEUED',
      createdAt: nowIso,
      updatedAt: nowIso,
      finalGeoScore: null,
    } as AnalysisJob;

    await createJobInFirestore(newJob);

    // Best-effort doğrulama
    let wroteOk: boolean | undefined = undefined;
    try {
      const check = await getJobFromFirestore(jobId);
      wroteOk = !!check;
    } catch {
      // no-op
    }

    // Internal base URL (ENV geçersizse same-origin)
    let baseUrl = INTERNAL_API_URL_ENV;
    try {
      if (!baseUrl) throw new Error('no_base');
      const u = new URL(baseUrl);
      if (/[<>]/.test(u.href)) throw new Error('placeholder');
      baseUrl = u.origin;
    } catch {
      baseUrl = new URL(request.url).origin;
    }

    const key = INTERNAL_API_TOKEN_ENV;
    if (!key) {
      await updateJobInFirestore(jobId, {
        status: 'FAILED',
        updatedAt: new Date().toISOString(),
        error: 'Server is not configured',
      });
      return NextResponse.json({ error: 'Server is not configured' }, { status: 500 });
    }

    const enqueueUrl = `${baseUrl}/api/internal/enqueue-analysis`;
    const body = {
      jobId,
      userId: 'public',
      domain: (() => {
        try {
          return new URL(normalizedUrl).hostname;
        } catch {
          return normalizedUrl;
        }
      })(),
    };
    const ts = Date.now().toString();
    const payload = `${ts}.${JSON.stringify(body)}`;
    const sig = crypto.createHmac('sha256', key).update(payload).digest('hex');

    // Fire-and-forget; hata olursa FAILED’a çek
    fetch(enqueueUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Token': key,
        'X-Timestamp': ts,
        'X-Signature': sig,
      },
      body: JSON.stringify(body),
    })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          await updateJobInFirestore(jobId, {
            status: 'FAILED',
            updatedAt: new Date().toISOString(),
            error: `enqueue failed: ${res.status} ${res.statusText} - ${text}`,
          });
        }
      })
      .catch(async (err) => {
        await updateJobInFirestore(jobId, {
          status: 'FAILED',
          updatedAt: new Date().toISOString(),
          error: err?.message || 'enqueue failed',
        });
      });

    // 202: arka planda kuyruğa attık
    return NextResponse.json({ jobId, wroteOk }, { status: 202 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Beklenmeyen bir hata olustu.' },
      { status: 500 }
    );
  }
}
