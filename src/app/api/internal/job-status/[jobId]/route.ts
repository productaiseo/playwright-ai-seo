/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { AnalysisJob } from '@/types/geo';
import { getJobFromFirestore } from '@/lib/firebase-admin';
// import { getAdminAuth } from '@/lib/firebase-admin';

export async function generateStaticParams() {
  return [];
}

export async function GET(
  request: NextRequest, 
  // { params }: { params: { jobId: string } }
  props: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await props.params;
    console.log('Fetching job status for', jobId);

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }
/* 
    // AuthZ: require Firebase ID token and enforce job ownership
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
     */
    // let userId: string | undefined;
    try {
      // const decoded = await getAdminAuth().verifyIdToken(token);
      // userId = decoded.uid;
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let job = await getJobFromFirestore(jobId);

    // Fallback: If Admin SDK is not initialized (Cloud Run ADC path), try Firestore REST API via ADC
    if (!job) {
      try {
        const { GoogleAuth } = require('google-auth-library');
        const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/datastore'] });
        const client = await auth.getClient();
        const token = await client.getAccessToken();
        const inferredProject = (await auth.getProjectId()) || process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || '';
        if (inferredProject && token) {
          const name = `projects/${inferredProject}/databases/(default)/documents/analysisJobs/${jobId}`;
          const url = `https://firestore.googleapis.com/v1/${encodeURI(name)}`;
          const resp = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
          if (resp.ok) {
            const doc = await resp.json();
            const fields: any = (doc as any)?.fields;
            if (fields) {
              const parseVal = (v: any): any => {
                if (v?.stringValue !== undefined) return v.stringValue;
                if (v?.integerValue !== undefined) return Number(v.integerValue);
                if (v?.doubleValue !== undefined) return Number(v.doubleValue);
                if (v?.booleanValue !== undefined) return Boolean(v.booleanValue);
                if (v?.nullValue !== undefined) return null;
                if (v?.timestampValue !== undefined) return v.timestampValue;
                if (v?.mapValue?.fields) {
                  const obj: any = {};
                  for (const k of Object.keys(v.mapValue.fields)) obj[k] = parseVal(v.mapValue.fields[k]);
                  return obj;
                }
                if (v?.arrayValue?.values) return v.arrayValue.values.map(parseVal);
                return v;
              };
              const data: any = {};
              for (const k of Object.keys(fields)) data[k] = parseVal(fields[k]);
              data.id = jobId;
              job = data as AnalysisJob;
            }
          }
        }
      } catch (e) {
        console.error('[job-status] Firestore REST fallback failed:', e);
      }
    }

    if (!job) {
      // If job not found yet, treat as queued instead of hard 404 to avoid breaking UX
      return NextResponse.json({ status: 'QUEUED' }, { status: 202 });
    }
/* 
    // Enforce ownership
    if ((job as any).userId && (job as any).userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
 */
    // Rapor tamamlandıysa, tam iş nesnesini döndür
    if (job.status === 'COMPLETED') {
      return NextResponse.json({ status: job.status, job });
    }
    
    // Rapor devam ediyorsa veya hata verdiyse, sadece durumu döndür
    return NextResponse.json({ status: job.status, error: job.error });

  } catch (error) {
    console.error(`Error fetching job status`, error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
