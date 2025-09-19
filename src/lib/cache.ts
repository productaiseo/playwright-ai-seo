/* eslint-disable @typescript-eslint/no-explicit-any */
import crypto from 'crypto';
import { getAdminDb } from '@/lib/firebase-admin';

const IS_TEST_ENV = process.env.JEST_WORKER_ID !== undefined || process.env.NODE_ENV === 'test';

const CACHE_COLLECTION = 'cache';

function keyToId(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

export async function cacheGet<T = any>(key: string): Promise<T | null> {
  try {
    if (IS_TEST_ENV) return null;
    const adminDb = getAdminDb();
    if (!adminDb) return null;
    const id = keyToId(key);
    const snap = await adminDb.collection(CACHE_COLLECTION).doc(id).get();
    if (!snap.exists) return null;
    const data = snap.data() as { v: T; exp: FirebaseFirestore.Timestamp } | undefined;
    if (!data) return null;
    const expiresAt = data.exp?.toMillis?.() ?? 0;
    if (Date.now() >= expiresAt) {
      // Expired – best-effort cleanup
      adminDb.collection(CACHE_COLLECTION).doc(id).delete().catch(() => {});
      return null;
    }
    return data.v ?? null;
  } catch {
    return null;
  }
}

export async function cacheSet<T = any>(key: string, value: T, ttlSeconds: number): Promise<void> {
  try {
    if (IS_TEST_ENV) return;
    const adminDb = getAdminDb();
    if (!adminDb) return;
    const id = keyToId(key);
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    await adminDb.collection(CACHE_COLLECTION).doc(id).set({ v: value, exp: expiresAt }, { merge: true });
  } catch {
    // ignore cache errors
  }
}
