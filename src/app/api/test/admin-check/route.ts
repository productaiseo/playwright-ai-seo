/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const auth = getAdminAuth();
    const token = await auth.createCustomToken('admin-check-user');

    const db = getAdminDb();
    if (!db) {
      return NextResponse.json({ ok: false, error: 'Firestore not initialized' }, { status: 500 });
    }
    // lightweight read to confirm access (uses your _test doc pattern)
    await db.collection('_test').doc('_test').get();

    return NextResponse.json({ ok: true, authTokenCreated: Boolean(token) });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
