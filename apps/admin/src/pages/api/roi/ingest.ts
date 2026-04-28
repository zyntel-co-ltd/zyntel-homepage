import type { APIRoute } from 'astro';
import { createHash } from 'crypto';
import { getServiceClientById, updateServiceClient } from '../../../lib/maintenance.ts';
import { createSnapshot } from '../../../lib/roi.ts';
import { listROIMetricDefinitions, upsertROIMetricDefinition } from '../../../lib/roi-metrics.ts';

function sha256Hex(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

function isIsoDate(d: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(d);
}

type Cadence = 'daily' | 'weekly' | 'monthly';
function shouldStore(cadence: Cadence, snapshotDate: string): boolean {
  const dt = new Date(snapshotDate + 'T00:00:00Z');
  if (Number.isNaN(dt.getTime())) return false;
  if (cadence === 'daily') return true;
  if (cadence === 'weekly') {
    // Monday-only to keep schedule deterministic across products/timezones
    return dt.getUTCDay() === 1;
  }
  if (cadence === 'monthly') {
    return dt.getUTCDate() === 1;
  }
  return true;
}

export const POST: APIRoute = async ({ request }) => {
  const apiKey = String(request.headers.get('x-zyntel-key') ?? request.headers.get('X-Zyntel-Key') ?? '').trim();
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Missing X-Zyntel-Key' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: any = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const serviceClientId = String(body?.serviceClientId ?? '').trim();
  const snapshotDate = String(body?.snapshotDate ?? '').trim();
  const metrics = body?.metrics ?? null;
  const source = String(body?.source ?? 'api_pull') === 'manual_entry' ? 'manual_entry' : 'api_pull';

  if (!serviceClientId || !snapshotDate || !metrics || typeof metrics !== 'object') {
    return new Response(JSON.stringify({ error: 'serviceClientId, snapshotDate, and metrics required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (!isIsoDate(snapshotDate)) {
    return new Response(JSON.stringify({ error: 'snapshotDate must be YYYY-MM-DD' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const client = await getServiceClientById(serviceClientId);
  if (!client) {
    return new Response(JSON.stringify({ error: 'Service client not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const expected = client.apiKeyHash ? String(client.apiKeyHash) : '';
  if (!expected || sha256Hex(apiKey) !== expected) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Load definitions; if missing, auto-create as daily number metrics (keeps onboarding friction low)
  const defs = await listROIMetricDefinitions();
  const byKey = new Map(defs.map((d) => [d.key, d]));

  const stored: string[] = [];
  const skipped: string[] = [];
  for (const [key, rawVal] of Object.entries(metrics as Record<string, unknown>)) {
    const metricKey = String(key).trim();
    if (!metricKey) continue;
    const metricValue = Number(rawVal);
    if (Number.isNaN(metricValue) || !Number.isFinite(metricValue)) continue;

    let def = byKey.get(metricKey);
    if (!def) {
      def = await upsertROIMetricDefinition({
        key: metricKey,
        label: metricKey.replace(/_/g, ' '),
        cadence: 'daily',
        format: 'number',
        direction: 'higher_is_better',
      });
      byKey.set(metricKey, def);
    }

    const cadence = (def.cadence ?? 'daily') as Cadence;
    if (!shouldStore(cadence, snapshotDate)) {
      skipped.push(metricKey);
      continue;
    }

    await createSnapshot({
      serviceClientId,
      snapshotDate,
      metricKey,
      metricValue,
      source: source as any,
      notes: null,
    });
    stored.push(metricKey);
  }

  await updateServiceClient(serviceClientId, {
    roiLastSyncedAt: new Date(),
    roiLastSyncError: null,
  });

  return new Response(JSON.stringify({ ok: true, stored, skipped }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

