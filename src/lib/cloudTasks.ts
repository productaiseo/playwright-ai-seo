/* eslint-disable @typescript-eslint/no-explicit-any */
import logger from '@/utils/logger';

interface CreateTaskParams {
  projectId?: string;
  location?: string; // e.g., 'us-central1'
  queueId?: string; // e.g., 'aiseo-analysis'
  url: string; // target HTTP url
  payload?: any; // will be JSON-stringified and base64-encoded
  headers?: Record<string, string>;
  serviceAccountEmail?: string; // for OIDC token on task delivery
}

export async function createHttpTask({ projectId, location = 'us-central1', queueId = 'aiseo-analysis', url, payload, headers, serviceAccountEmail }: CreateTaskParams): Promise<string> {
  const inferredProject = projectId || (() => {
    try { const cfg = JSON.parse(process.env.FIREBASE_CONFIG || '{}'); return cfg.projectId || cfg.project_id; } catch { return undefined; }
  })() || process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID;
  if (!inferredProject) throw new Error('project_id_unavailable');

  const queuePath = `projects/${inferredProject}/locations/${location}/queues/${queueId}`;
  const tasksBase = `https://cloudtasks.googleapis.com/v2/${encodeURI(queuePath)}/tasks`;

  const httpRequest: any = {
    httpMethod: 'POST',
    url,
    headers: { 'Content-Type': 'application/json', ...(headers || {}) },
  };
  if (payload !== undefined) {
    const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
    httpRequest.body = body;
  }
  if (serviceAccountEmail) {
    httpRequest.oidcToken = { serviceAccountEmail } as any;
  }

  const bodyJson = { httpRequest };
/*
  const { GoogleAuth } = require('google-auth-library');
  const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  if (!token || typeof token !== 'string') throw new Error('no_access_token');
*/
  const resp = await fetch(tasksBase, {
    method: 'POST',
    headers: {
      // 'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ task: bodyJson }),
  } as any);

  if (!resp.ok) {
    const text = await resp.text().catch(()=> '');
    logger.error('Cloud Tasks create failed', 'cloudtasks', { status: resp.status, text });
    throw new Error(`cloud_tasks_create_failed_${resp.status}`);
  }

  const out = await resp.json().catch(()=> ({}));
  return out?.name || '';
}

