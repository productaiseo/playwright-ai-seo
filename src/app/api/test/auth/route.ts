/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-require-imports */
/*
const admin = require('firebase-admin');
const serviceAccount = require('../../../../firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'aiseo-mvp-77790251'
});

async function test() {
  try {
    const auth = admin.auth();
    const token = await auth.createCustomToken('test-user');
    console.log('Success: Token created');
    const db = admin.firestore();
    await db.collection('_test').doc('_test').get();
    console.log('Success: Firestore accessible');
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error:', error.message);
    } else {
      console.error('Error:', error);
    }
  }
}

test();

*/
import { NextResponse } from 'next/server';
export const runtime = 'nodejs';
import * as admin from 'firebase-admin';

function getServiceAccount(): admin.ServiceAccount & { project_id?: string } {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is missing');

  let jsonText = raw.trim();

  // If it doesn't look like JSON, try base64 first
  if (!jsonText.startsWith('{')) {
    try {
      jsonText = Buffer.from(jsonText, 'base64').toString('utf8').trim();
    } catch {/* ignore */}
  }

  let obj: any;
  try {
    obj = JSON.parse(jsonText);
  } catch (e) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON or base64-JSON. ' +
      'Prefer base64 single-line value in .env.'
    );
  }

  // Normalize private key
  if (typeof obj.private_key === 'string' && obj.private_key.includes('\\n')) {
    obj.private_key = obj.private_key.replace(/\\n/g, '\n');
  }

  return obj as admin.ServiceAccount & { project_id?: string };
}

function ensureAdmin() {
  if (admin.apps.length) return;
  const sa = getServiceAccount();
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    projectId: sa.project_id,
  });
}

async function test() {
  ensureAdmin();
  const auth = admin.auth();
  const token = await auth.createCustomToken('test-user');
  console.log('Success: Token created');

  const db = admin.firestore();
  await db.collection('_test').doc('_test').get();
  console.log('Success: Firestore accessible');
}

export async function GET() {
  try {
    await test();

    ensureAdmin();
    const auth = admin.auth();
    const token = await auth.createCustomToken('test-user');
    const db = admin.firestore();
    const snap = await db.collection('_test').doc('_test').get();

    return NextResponse.json({
      ok: true,
      steps: {
        customTokenCreated: !!token,
        firestoreAccessible: snap.exists ?? false,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
