/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
import { v4 as uuidv4 } from 'uuid';
// Use admin from our helper to ensure single initialization
// import { getAdminAuth } from '@/lib/firebase-admin';
// import crypto from 'crypto';
import { createJobInFirestore, updateJobInFirestore, getJobFromFirestore } from '@/lib/firebase-admin';
import { AnalysisJob } from '@/types/geo';

export async function POST(request: NextRequest) {
  try {
    const payloadJson = await request.json();
    const url: string | undefined = payloadJson?.url;

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL gereklidir ve bir metin olmalidir.' }, { status: 400 });
    }

    const normalizedUrl = url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
    const nowIso = new Date().toISOString();
    const jobId = uuidv4();

    const newJob: AnalysisJob = {
      id: jobId,
      // userId: uid,
      url: normalizedUrl,
      status: 'QUEUED',
      createdAt: nowIso,
      updatedAt: nowIso,
      finalGeoScore: null,
    } as AnalysisJob;

    // await createJobInFirestore(newJob);
    // Quick verify write (best-effort)
/*
    let wroteOk: boolean | undefined = undefined;
    try {
      const check = await getJobFromFirestore(jobId);
      wroteOk = !!check;
    } catch {}
*/
    // Start orchestration – internal endpoint
    // Prefer configured internal URL; fallback to same origin to reduce misconfig friction
    // Validate INTERNAL_API_URL; fall back to same-origin if invalid or placeholder

    let baseUrl = process.env.INTERNAL_API_URL;
/*
    try {
      if (!baseUrl) throw new Error('no_base');
      const u = new URL(baseUrl);
      // Basic sanity check to catch placeholders like <project-id>
      if (/[<>]/.test(u.href)) throw new Error('placeholder');
      baseUrl = u.origin;
    } catch {
      baseUrl = new URL(request.url).origin;
    }
    const key = process.env.INTERNAL_API_TOKEN || '';
    if (!key) {
      // If misconfigured, mark job failed
      await updateJobInFirestore(jobId, { status: 'FAILED', updatedAt: new Date().toISOString(), error: 'Server is not configured' });
      return NextResponse.json({ error: 'Server is not configured' }, { status: 500 });
    }
*/
    const enqueueUrl = `${baseUrl}/api/internal/enqueue-analysis`;
    const body = { 
      jobId, 
      userId: 'public', 
      domain: normalizedUrl };
    const ts = Date.now().toString();
    const payload = `${ts}.${JSON.stringify(body)}`;
    // const sig = crypto.createHmac('sha256', key).update(payload).digest('hex');

    // Fire-and-forget; on failure mark job as FAILED
    fetch(enqueueUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 'X-Internal-Token': key,
        'X-Timestamp': ts,
        // 'X-Signature': sig,
      },
      body: JSON.stringify(body),
    }).then(async (res) => {
      if (!res.ok) {
        console.error('Enqueue failed', await res.text());
        // const text = await res.text();
        // await updateJobInFirestore(jobId, { status: 'FAILED', updatedAt: new Date().toISOString(), error: `enqueue failed: ${res.status} ${res.statusText} - ${text}` });
      }
    }).catch(async (err) => {
      console.error('Enqueue failed', err?.message || 'enqueue failed');
      // await updateJobInFirestore(jobId, { status: 'FAILED', updatedAt: new Date().toISOString(), error: err?.message || 'enqueue failed' });
    });

    return NextResponse.json({ jobId, 
      // wroteOk 
    });
  } catch (error) {
    return NextResponse.json({ error: 'Beklenmeyen bir hata olustu.' }, { status: 500 });
  }
}
