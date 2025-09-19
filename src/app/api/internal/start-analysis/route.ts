import { NextRequest, NextResponse } from 'next/server';
import { orchestrateAnalysis } from '@/services/analysisOrchestrator';
import logger from '@/utils/logger';
import { AnalysisJob } from '@/types/geo';
import crypto from 'crypto';
import { updateJobInFirestore } from '@/lib/firebase-admin';


export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds

export async function POST(request: NextRequest) {
  try {
    const token = (request.headers.get('x-internal-token') || '').trim();
    const ts = request.headers.get('x-timestamp') || '';
    const signature = request.headers.get('x-signature') || '';

    const serverToken = (process.env.INTERNAL_API_TOKEN || '').trim();
    if (!serverToken) {
      console.error('[internal-start] INTERNAL_API_TOKEN missing in env');
      return NextResponse.json({ error: 'Server is not configured' }, { status: 500 });
    }
    // Basic token check
    if (token !== serverToken) {
      console.error('[internal-start] Unauthorized: token mismatch. len(client)=', token?.length || 0, ' len(server)=', (serverToken?.length || 0));
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    // HMAC signature check (optional, if timestamp & signature provided)
    if (ts && signature) {
      const tsNum = Number(ts);
      if (!Number.isFinite(tsNum) || Math.abs(Date.now() - tsNum) > 5 * 60 * 1000) {
        console.error('[internal-start] Timestamp expired or invalid:', ts);
        return NextResponse.json({ error: 'Timestamp expired' }, { status: 403 });
      }
      const raw = await request.clone().text();
      // Normalize body to avoid minor whitespace/ordering diffs between clients
      let canonical = raw;
      try {
        canonical = JSON.stringify(JSON.parse(raw));
      } catch {}
      const payload = `${ts}.${canonical}`;
      const expected = crypto.createHmac('sha256', serverToken).update(payload).digest('hex');
      if (expected !== signature) {
        console.error('[internal-start] Invalid signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
      }
    }
    const body = await request.json();
    const { jobId, userId, domain } = body || {};

    if (!jobId || !userId || !domain) {
      return NextResponse.json({ error: 'jobId, userId ve domain zorunludur' }, { status: 400 });
    }

    const job: AnalysisJob = {
      id: jobId,
      userId,
      url: domain.startsWith('http') ? domain : `https://${domain}`,
      status: 'QUEUED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      finalGeoScore: null,
    } as AnalysisJob;

    // Mark as PROCESSING early so UI doesn't appear stuck at QUEUED
    try {
      await updateJobInFirestore(job.id, { 
        status: 'PROCESSING', updatedAt: new Date().toISOString() 
      });
    } catch (e) {
      // Non-fatal; orchestrator will attempt to update again
    }

    // Fire and return early (do not await long-running orchestration)
    orchestrateAnalysis(job).catch((error) => {
      logger.error('orchestrateAnalysis failed (detached)', 'internal-start-analysis', { error });
    });

    return NextResponse.json({ ok: true, queued: true }, { status: 202 });
  } catch (error) {
    logger.error('start-analysis internal API failed', 'internal-start-analysis', { error });
    return NextResponse.json({ error: 'start-analysis failed' }, { status: 500 });
  }
}
