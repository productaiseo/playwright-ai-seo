/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { createJobInFirestore, updateJobInFirestore, getJobFromFirestore } from '@/lib/firebase-admin';
import { AnalysisJob } from '@/types/geo';

export async function POST(request: NextRequest) {
  try {
    const payloadJson = await request.json();
    const url: string | undefined = payloadJson?.url;

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL gereklidir ve bir metin olmalidir.' }, { status: 400 });
    }

    const normalizedUrl =
      url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;

    // 1) ÖNCE: Public proxy varsa, job oluşturma; direkt oraya yönlendir ve sonucu döndür.
    const publicUrlRaw = process.env.ANALYZE_PUBLIC_URL?.trim();
    const publicUrlOk =
      publicUrlRaw &&
      (() => {
        try {
          const u = new URL(publicUrlRaw);
          return !/[<>]/.test(u.href);
        } catch {
          return false;
        }
      })();

    if (publicUrlOk) {
      try {
        const resp = await fetch(publicUrlRaw as string, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: normalizedUrl,
            userId: 'public', // istersen gerçek uid geçebilirsin
          }),
        });

        const json = await resp.json().catch(() => ({}));
        return NextResponse.json(json, { status: resp.status });
      } catch (e) {
        // Proxy başarısızsa internal akışa düş (fallback)
      }
    }

    // 2) INTERNAL AKIŞ: job’ı biz oluşturur, internal enqueue ederiz.
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
    } catch {}

    // Internal base URL belirle (ENV geçersizse same-origin)
    let baseUrl = process.env.INTERNAL_API_URL;
    try {
      if (!baseUrl) throw new Error('no_base');
      const u = new URL(baseUrl);
      if (/[<>]/.test(u.href)) throw new Error('placeholder');
      baseUrl = u.origin;
    } catch {
      baseUrl = new URL(request.url).origin;
    }

    const key = process.env.INTERNAL_API_TOKEN || '';
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

    // Fire-and-forget; hata olursa job’ı FAILED’a çek
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

    // 202 tercih ettim ama mevcut davranışı korumak istersen 200 bırakabilirsin
    return NextResponse.json({ jobId, wroteOk }, { status: 202 });
  } catch (error) {
    return NextResponse.json({ error: 'Beklenmeyen bir hata olustu.' }, { status: 500 });
  }
}
