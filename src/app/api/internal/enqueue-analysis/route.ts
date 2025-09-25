/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
import crypto from 'crypto';
// import { createHttpTask } from '@/lib/cloudTasks';
import logger from '@/utils/logger';

// Enqueue analysis via Cloud Tasks (if configured), else call orchestrator with OIDC, else fallback to local start-analysis
export async function POST(request: NextRequest) {
  try {
    let body: any;
    try {
      body = await request.json();
    } catch (e) {
      logger.error('Invalid JSON body', 'enqueue-analysis', { e });
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const { jobId, userId, domain } = body || {};
    if (!jobId || !userId || !domain) {
      return NextResponse.json({ error: 'jobId, userId ve domain zorunludur' }, { status: 400 });
    }

    const orchestratorUrl = (process.env.INTERNAL_ORCHESTRATOR_URL || '').trim();
    const preferTasks = (process.env.CLOUD_TASKS_ENABLED || '').trim() === 'true' || !!process.env.CLOUD_TASKS_QUEUE;
    const token = (process.env.INTERNAL_API_TOKEN || '').trim();
    const payload = { jobId, userId, domain };
/* 
    if (preferTasks) {
      console.log('cloud tasks preferred:', preferTasks, !!process.env.CLOUD_TASKS_QUEUE);
      try {
        const serviceAccountEmail = (process.env.TASKS_SERVICE_ACCOUNT_EMAIL || `${process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || ''}@appspot.gserviceaccount.com`).trim();
        const location = process.env.CLOUD_TASKS_LOCATION || 'us-central1';
        const queueId = process.env.CLOUD_TASKS_QUEUE || 'aiseo-analysis';
        let target = orchestratorUrl;
        if (!target) target = new URL(request.url).origin + '/api/internal/start-analysis';
        await createHttpTask({ url: target, payload, location, queueId, serviceAccountEmail });
        return NextResponse.json({ ok: true, queued: true, via: 'cloud-tasks' }, { status: 202 });
      } catch (err) {
        logger.warn('Cloud Tasks enqueue failed, will try orchestrator/local', 'enqueue-analysis', { err });
      }
    }

    if (orchestratorUrl) {
      let orchestratorOk = false;
      console.log('orchestrator url:', orchestratorUrl);
      try {
        const { GoogleAuth } = require('google-auth-library');
        const auth = new GoogleAuth();
        const idClient = await auth.getIdTokenClient(orchestratorUrl);
        const r = await idClient.request({ url: orchestratorUrl, method: 'POST', data: payload, headers: { 'Content-Type': 'application/json' } });
        if (r.status && r.status >= 200 && r.status < 300) {
          orchestratorOk = true;
          return NextResponse.json({ ok: true, queued: true, via: 'oidc' }, { status: 202 });
        }
      } catch (err) {
        logger.warn('OIDC call to orchestrator failed, will try HMAC', 'enqueue-analysis', { err });
      }
      if (!orchestratorOk) {
        try {
          const ts2 = Date.now().toString();
          const sig2 = token ? crypto.createHmac('sha256', token).update(`${ts2}.${JSON.stringify(payload)}`).digest('hex') : '';
          const resp = await fetch(orchestratorUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(token ? { 'X-Internal-Token': token, 'X-Timestamp': ts2, 'X-Signature': sig2 } : {}) },
            body: JSON.stringify(payload),
          } as any);
          if (resp.ok) {
            orchestratorOk = true;
            return NextResponse.json({ ok: true, queued: true, via: 'hmac' }, { status: 202 });
          }
        } catch (err) {
          logger.warn('HMAC call to orchestrator failed', 'enqueue-analysis', { err });
        }
      }
      // If orchestrator calls failed, fall through to local start-analysis fallback below
    }
 */
    // Fallback: call local start-analysis
    const base = new URL(request.url).origin;
    const startUrl = `${base}/api/internal/start-analysis`;
    const ts = Date.now().toString();
    const sig = token ? crypto.createHmac('sha256', token).update(`${ts}.${JSON.stringify(payload)}`).digest('hex') : '';
    const res = await fetch(startUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { 'X-Internal-Token': token, 'X-Timestamp': ts, 'X-Signature': sig } : {}) },
      body: JSON.stringify(payload),
    } as any);
    if (!res.ok) {
      const text = await res.text().catch(()=> '');
      logger.error(`start-analysis failed: ${res.status} ${res.statusText}`, 'enqueue-analysis', { text });
      return NextResponse.json({ error: `start-analysis failed: ${res.status} ${res.statusText}`, detail: text }, { status: 502 });
    }
    return NextResponse.json({ ok: true, queued: true }, { status: 202 });
  } catch (e: any) {
    logger.error('enqueue failed', 'enqueue-analysis', { message: e?.message, stack: e?.stack });
    return NextResponse.json({ error: 'enqueue failed', detail: e?.message || String(e) }, { status: 500 });
  }
}
