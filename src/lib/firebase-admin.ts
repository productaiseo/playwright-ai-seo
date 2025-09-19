/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-explicit-any */
import admin from 'firebase-admin';
import type { App } from 'firebase-admin/app';
import type { Firestore } from 'firebase-admin/firestore';
// Avoid importing heavy googleapis; use google-auth-library lazily in REST fallbacks
import { AnalysisJob } from '@/types/geo';

type GlobalWithAdmin = typeof globalThis & {
  __ADMIN_APP__?: App;
  __ADMIN_DB__?: Firestore;
  __ADMIN_INIT_TRIED__?: boolean;
};

const g = globalThis as GlobalWithAdmin;

function inferProjectId(): string | undefined {
  try {
    const cfgStr = process.env.FIREBASE_CONFIG;
    if (cfgStr) {
      const cfg = JSON.parse(cfgStr);
      const pid = (cfg as any)?.projectId || (cfg as any)?.project_id;
      if (pid) return String(pid);
    }
  } catch {}
  return (
    process.env.GCLOUD_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    undefined
  );
}

function ensureAdminApp(): App {
  console.log('[admin-init] ensureAdminApp invoked');
  
  if (g.__ADMIN_APP__) {
    console.log('[admin-init] returning cached app');
    return g.__ADMIN_APP__;
  }

  // Always check for the actual [DEFAULT] app first
  try {
    const def = admin.app();
    console.log('[admin-init] found existing [DEFAULT] app');
    g.__ADMIN_APP__ = def;
    return def;
  } catch (err: any) {
    console.log('[admin-init] default app missing, will initialize');
  }

  const projectId = inferProjectId();
  console.log('[admin-init] inferred projectId =', projectId || '(none)');

  // 1) Try service account from environment variables
  const saStr = 
    process.env.SERVICE_ACCOUNT_JSON ||
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
    process.env.SERVICE_ACCOUNT_JSON_BASE64 ||
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64;

  if (saStr && saStr.trim().length > 10) {
    try {
      console.log('[admin-init] using SERVICE_ACCOUNT env');
      let sa: any;
      let raw = saStr.trim();

      // Handle base64 encoded service accounts
      const maybeB64 = /^[A-Za-z0-9+/=\r\n]+$/.test(raw) && raw.replace(/\s+/g, '').length % 4 === 0;
      if (maybeB64) {
        try {
          const decoded = Buffer.from(raw, 'base64').toString('utf8');
          if (decoded.trim().startsWith('{')) raw = decoded;
        } catch {}
      }

      try {
        sa = JSON.parse(raw);
      } catch (parseErr) {
        // Try to repair common issue: unescaped newlines in private_key
        try {
          const repaired = raw.replace(/"private_key"\s*:\s*"([\s\S]*?)"/m, (_m: string, p1: string) => {
            const normalized = p1.replace(/\r?\n/g, '\\n');
            return `"private_key":"${normalized}"`;
          });
          sa = JSON.parse(repaired);
        } catch (repairErr) {
          // Try as file path
          try {
            const fs = require('node:fs');
            const path = require('node:path');
            const resolvedPath = path.resolve(raw);
            if (fs.existsSync(resolvedPath)) {
              const fileStr = fs.readFileSync(resolvedPath, 'utf8');
              sa = JSON.parse(fileStr);
              console.log('[admin-init] parsed service account from file path in env');
            } else {
              throw parseErr;
            }
          } catch {
            throw parseErr;
          }
        }
      }

      g.__ADMIN_APP__ = admin.initializeApp({
        credential: admin.credential.cert(sa),
        projectId: projectId || sa.project_id,
      });
      console.log('[admin-init] initialized with service account from env');
      return g.__ADMIN_APP__;
    } catch (e) {
      console.warn('Admin init with SERVICE_ACCOUNT env failed:', e);
    }
  }

  // 2) Try local service account file
  try {
    const fs = require('node:fs');
    const path = require('node:path');
    
    const possiblePaths = [
      'firebase-service-account.json',
      './firebase-service-account.json',
      path.join(process.cwd(), 'firebase-service-account.json')
    ];

    for (const filePath of possiblePaths) {
      try {
        if (fs.existsSync(filePath)) {
          console.log(`[admin-init] using service account file: ${filePath}`);
          const fileStr = fs.readFileSync(filePath, 'utf8');
          const sa = JSON.parse(fileStr);
          g.__ADMIN_APP__ = admin.initializeApp({
            credential: admin.credential.cert(sa),
            projectId: projectId || sa.project_id,
          });
          console.log('[admin-init] initialized with service account file');
          return g.__ADMIN_APP__;
        }
      } catch (e) {
        console.warn(`Failed to read service account from ${filePath}:`, e);
      }
    }
  } catch (e) {
    console.warn('Failed to read service account file:', e);
  }

  // 3) Try Application Default Credentials (for Cloud Run/Functions)
  try {
    console.log('[admin-init] trying applicationDefault() with inferred projectId');
    const opts: any = { credential: admin.credential.applicationDefault() };
    if (projectId) opts.projectId = projectId;
    g.__ADMIN_APP__ = admin.initializeApp(opts);
    console.log('[admin-init] initialized with ADC');
    return g.__ADMIN_APP__;
  } catch (e) {
    console.warn('Admin init failed with ADC:', e);
  }

  // 4) Try GOOGLE_APPLICATION_CREDENTIALS environment variable
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    try {
      console.log('[admin-init] trying GOOGLE_APPLICATION_CREDENTIALS');
      g.__ADMIN_APP__ = admin.initializeApp({
        projectId: projectId,
      });
      console.log('[admin-init] initialized with GOOGLE_APPLICATION_CREDENTIALS');
      return g.__ADMIN_APP__;
    } catch (e) {
      console.warn('Admin init failed with GOOGLE_APPLICATION_CREDENTIALS:', e);
    }
  }

  throw new Error('Firebase Admin SDK failed to initialize. Please check your credentials.');
}

export function getAdminDb(): Firestore | null {
  try {
    if (!g.__ADMIN_DB__) {
      const app = ensureAdminApp();
      const db = admin.firestore(app) as unknown as Firestore;

      // ⬇️ drop undefineds automatically (Admin SDK feature)
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - settings exists at runtime
      db.settings({ ignoreUndefinedProperties: true });

      g.__ADMIN_DB__ = db;
    }
    return g.__ADMIN_DB__!;
  } catch (e) {
    console.error('Firebase Admin getAdminDb failed:', e);
    return null;
  }
}

export function getAdminAuth() {
  try {
    const app = ensureAdminApp();
    return admin.auth(app);
  } catch (e) {
    console.error('Firebase Admin getAdminAuth failed:', e);
    throw e;
  }
}


function removeUndefinedDeep<T>(v: T): T {
  if (Array.isArray(v)) return v.map(removeUndefinedDeep).filter(x => x !== undefined) as any;
  if (v && typeof v === 'object') {
    const out: any = {};
    for (const [k, val] of Object.entries(v as any)) {
      const sv = removeUndefinedDeep(val as any);
      if (sv !== undefined) out[k] = sv;
    }
    return out;
  }
  return v;
}


// Rest of your functions remain the same...
export async function createJobInFirestore(job: AnalysisJob): Promise<void> {
  const adb = getAdminDb();
  if (!adb) {
    console.warn('Firebase is not initialized. createJobInFirestore will try REST fallback.');
    try {
      await createJobViaRest(job);
    } catch (e) {
      console.error('REST fallback createJobInFirestore failed:', e);
      throw e;
    }
    return;
  }
  
  try {
    const payload = removeUndefinedDeep(job);
    await adb.collection('analysisJobs').doc(job.id).set(payload as any);
  } catch (e) {
    console.error('createJobInFirestore failed:', e);
    throw e;
  }
}

export async function updateJobInFirestore(
  jobId: string,
  updates: Partial<AnalysisJob>
): Promise<void> {
  const adb = getAdminDb();
  if (!adb) {
    console.warn('Firebase is not initialized. updateJobInFirestore will try REST fallback.');
    try {
      await updateJobViaRest(jobId, updates);
    } catch (e) {
      console.error('REST fallback updateJobInFirestore failed:', e);
      throw e;
    }
    return;
  }
  
  try {
    const payload = removeUndefinedDeep({ ...updates, id: jobId });
    await adb.collection('analysisJobs').doc(jobId).set(payload as any, { merge: true });
  } catch (e) {
    console.error('updateJobInFirestore failed:', e);
    throw e;
  }
}

export async function getJobFromFirestore(jobId: string): Promise<AnalysisJob | null> {
  const adb = getAdminDb();
  if (!adb) {
    console.warn('Firebase is not initialized. getJobFromFirestore will try REST fallback.');
    try {
      return await getJobViaRest(jobId);
    } catch (e) {
      console.error('REST fallback getJobFromFirestore failed:', e);
      return null;
    }
  }
  
  try {
    const doc = await adb.collection('analysisJobs').doc(jobId).get();
    if (!doc?.exists) {
      console.log('getJobFromFirestore: no such job', jobId);
      return null;
    }
    return doc.data() as AnalysisJob;
  } catch (e) {
    console.error('getJobFromFirestore failed:', e);
    return null;
  }
}

// REST API helper functions
async function getDatastoreAccessToken(): Promise<string> {
  const { GoogleAuth } = require('google-auth-library');
  const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/datastore'] });
  const tokenStr = await auth.getAccessToken();
  if (tokenStr && typeof tokenStr === 'string') return tokenStr;
  const client = await auth.getClient();
  const tokenObj = await client.getAccessToken();
  const token = typeof tokenObj === 'string' ? tokenObj : (tokenObj && tokenObj.token);
  if (!token) throw new Error('no_access_token');
  return token;
}

function toFirestoreFields(obj: any): any {
  const wrap = (v: any): any => {
    if (v === undefined) return undefined;         // ⬅️ skip
    if (v === null) return { nullValue: null };
    if (typeof v === 'string') return { stringValue: v };
    if (typeof v === 'number') return { doubleValue: v };
    if (typeof v === 'boolean') return { booleanValue: v };
    if (Array.isArray(v)) {
      const values = v.map(wrap).filter(x => x !== undefined);
      return { arrayValue: { values } };
    }
    if (typeof v === 'object') {
      const fields = toFirestoreFields(v);
      return { mapValue: { fields } };
    }
    return { stringValue: String(v) };
  };

  const out: any = {};
  for (const k of Object.keys(obj)) {
    const wrapped = wrap(obj[k]);
    if (wrapped !== undefined) out[k] = wrapped;   // ⬅️ only keep defined
  }
  return out;
}


async function createJobViaRest(job: AnalysisJob): Promise<void> {
  const projectId = inferProjectId();
  if (!projectId) throw new Error('projectId_unavailable');
  const token = await getDatastoreAccessToken();
  const name = `projects/${projectId}/databases/(default)/documents/analysisJobs/${job.id}`;
  const fields = toFirestoreFields(job as any);
  const qs = Object.keys(job as any).map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
  const patchUrl = `https://firestore.googleapis.com/v1/${encodeURI(name)}?${qs}`;
  let res = await fetch(patchUrl, { 
    method: 'PATCH', 
    headers: { 
      'Authorization': `Bearer ${token}`, 
      'Content-Type': 'application/json' 
    }, 
    body: JSON.stringify({ name, fields }) 
  });
  
  if (res.status === 404) {
    const createUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/analysisJobs?documentId=${encodeURIComponent(job.id)}`;
    res = await fetch(createUrl, { 
      method: 'POST', 
      headers: { 
        'Authorization': `Bearer ${token}`, 
        'Content-Type': 'application/json' 
      }, 
      body: JSON.stringify({ name, fields }) 
    });
  }
  
  if (!res.ok) throw new Error(`createJobViaRest failed: ${res.status} ${await res.text()}`);
}

async function updateJobViaRest(jobId: string, updates: Partial<AnalysisJob>): Promise<void> {
  const projectId = inferProjectId();
  if (!projectId) throw new Error('projectId_unavailable');
  const token = await getDatastoreAccessToken();
  const name = `projects/${projectId}/databases/(default)/documents/analysisJobs/${jobId}`;
  const payload: any = { ...updates, id: jobId };
  const fields = toFirestoreFields(payload);
  const qs = Object.keys(payload).map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
  const patchUrl = `https://firestore.googleapis.com/v1/${encodeURI(name)}?${qs}`;
  const res = await fetch(patchUrl, { 
    method: 'PATCH', 
    headers: { 
      'Authorization': `Bearer ${token}`, 
      'Content-Type': 'application/json' 
    }, 
    body: JSON.stringify({ name, fields }) 
  });
  
  if (!res.ok) throw new Error(`updateJobViaRest failed: ${res.status} ${await res.text()}`);
}

async function getJobViaRest(jobId: string): Promise<AnalysisJob | null> {
  try {
    const projectId = inferProjectId();
    if (!projectId) throw new Error('projectId_unavailable');
    
    const { GoogleAuth } = require('google-auth-library');
    const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/datastore'] });
    const token = await getDatastoreAccessToken();
    
    const name = `projects/${projectId}/databases/(default)/documents/analysisJobs/${jobId}`;
    const url = `https://firestore.googleapis.com/v1/${encodeURI(name)}`;
    const resp = await fetch(url, { 
      headers: { 'Authorization': `Bearer ${token}` } 
    });
    
    if (!resp.ok) {
      if (resp.status === 404) return null;
      throw new Error(`getJobViaRest failed: ${resp.status} ${await resp.text()}`);
    }
    
    const doc = await resp.json();
    const fields: any = doc?.fields;
    if (!fields) return null;
    
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
    console.log('getJobViaRest fetched job:', data);
    return data as AnalysisJob;
  } catch (e) {
    console.error('getJobViaRest failed:', e);
    return null;
  }
}
