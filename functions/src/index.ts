/**
 * Gen-2 HTTP Functions
 */
import { setGlobalOptions } from 'firebase-functions/v2';
import { onRequest } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';

// Aynı anda kaç container açılsın (maliyet/tepe yük dengesi)
setGlobalOptions({ maxInstances: 10 });

/**
 * Healthcheck (opsiyonel)
 */
export const ping = onRequest((_req, res) => {
  res.status(200).json({ ok: true, service: 'analyzeDomainPublic' });
});

/**
 * analyzeDomainPublic
 * Body: { url: string, userId?: string }
 * İş: Orchestrator (Cloud Run) servisine iletir ve 202 döner.
 */
export const analyzeDomainPublic = onRequest(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { url, userId = 'public' } = req.body ?? {};
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'url is required' });
    }

    // Cloud Run orchestrator URL (örn: https://orchestrateanalysis-....run.app)
    const ORCHESTRATE_URL =
      process.env.ORCHESTRATE_URL || 'https://orchestrateanalysis-e6jvnrn37q-uc.a.run.app';

    const resp = await fetch(ORCHESTRATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, userId }),
    });

    // Orchestrator non-200 dönerse yine de istemciye status/mesajı yansıt
    const json = await resp.json().catch(() => ({}));
    logger.info('forwarded to orchestrate', { status: resp.status, json });

    // İstemciye 202 vermek iyi bir kullanıcı deneyimi (accepted/queue)
    return res.status(202).json({ ok: true, via: 'analyzeDomainPublic', jobId: json?.jobId, orchestrate: 'forwarded' });
  } catch (err: any) {
    logger.error('analyzeDomainPublic error', { error: err?.message });
    return res.status(500).json({ error: 'internal_error', detail: err?.message });
  }
});
