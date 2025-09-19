/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-explicit-any */
// Firebase-native DB helpers
import { getAdminDb } from '@/lib/firebase-admin';
import { AnalysisJob } from '@/types/geo';

const JOBS = 'analysisJobs';
const REPORTS = 'reports';
const QUERIES = 'queries';

export async function getJob(id: string): Promise<AnalysisJob | null> {
  const adminDb = getAdminDb();
  if (!adminDb) return null;
  const snap = await adminDb.collection(JOBS).doc(id).get();
  return snap.exists ? (snap.data() as AnalysisJob) : null;
}

export async function updateJob(id: string, updates: Partial<AnalysisJob>): Promise<void> {
  const adminDb = getAdminDb();
  if (!adminDb) return;
  await adminDb.collection(JOBS).doc(id).set({ ...updates, updatedAt: new Date().toISOString() }, { merge: true });
}

// Persist a full report document under reports/{jobId}
export async function saveReport(queryId: string | undefined, job: AnalysisJob): Promise<void> {
  const adminDb = getAdminDb();
  if (!adminDb || !job?.id) return;
  const reportDoc = {
    jobId: job.id,
    userId: job.userId,
    domain: job.url,
    createdAt: job.createdAt,
    updatedAt: new Date().toISOString(),
    finalGeoScore: job.finalGeoScore ?? null,
    arkheReport: job.arkheReport ?? null,
    prometheusReport: job.prometheusReport ?? null,
    delfiAgenda: job.delfiAgenda ?? null,
    generativePerformanceReport: job.generativePerformanceReport ?? null,
    performanceReport: job.performanceReport ?? null,
    queryId: queryId ?? null,
    enhancedAnalysis: (job as any).enhancedAnalysis ?? null,
  };
  await adminDb.collection(REPORTS).doc(job.id).set(reportDoc, { merge: true });
}

// Optionally maintain a queries/{queryId} status document (if queryId provided)
export async function updateQueryStatus(queryId: string | undefined, status: string): Promise<void> {
  const adminDb = getAdminDb();
  if (!adminDb || !queryId) return;
  await adminDb.collection(QUERIES).doc(queryId).set({ status, updatedAt: new Date().toISOString() }, { merge: true });
}

// Append a job event to analysisJobs/{jobId}.events[]
export async function appendJobEvent(
  jobId: string,
  event: { step: string; status: 'STARTED' | 'COMPLETED' | 'FAILED'; timestamp?: string; detail?: any }
): Promise<void> {
  const adminDb = getAdminDb();
  if (!adminDb) return;
  const ts = event.timestamp || new Date().toISOString();
  try {
    const admin = require('firebase-admin');
    await adminDb.collection(JOBS).doc(jobId).set(
      { events: (admin.firestore as any).FieldValue.arrayUnion({ ...event, timestamp: ts }) },
      { merge: true }
    );
  } catch {
    // Best effort; ignore if FieldValue is unavailable
    try {
      const snap = await adminDb.collection(JOBS).doc(jobId).get();
      const data = snap.exists ? snap.data() || {} : {};
      const events = Array.isArray((data as any).events) ? (data as any).events : [];
      events.push({ ...event, timestamp: ts });
      await adminDb.collection(JOBS).doc(jobId).set({ events }, { merge: true });
    } catch {}
  }
}
