import type { APIRoute } from 'astro';
import { decryptString } from '../../../lib/admin-crypto.ts';
import { getServiceClientById, updateServiceClient } from '../../../lib/maintenance.ts';

export const GET: APIRoute = async ({ url, request }) => {
  const apiKey = request.headers.get('x-api-key') ?? request.headers.get('authorization')?.replace('Bearer ', '');
  const expectedKey = import.meta.env.INVOICE_API_KEY;
  if (expectedKey && apiKey !== expectedKey) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const serviceClientId = String(url.searchParams.get('serviceClientId') ?? '').trim();
  if (!serviceClientId) {
    return new Response(JSON.stringify({ error: 'serviceClientId required' }), {
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
  if (!client.apiUrl) {
    return new Response(JSON.stringify({ error: 'Service client has no API URL configured' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (!client.apiKeyEncrypted) {
    return new Response(JSON.stringify({ error: 'Pull mode not configured (no encrypted API key stored)' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const key = decryptString(String(client.apiKeyEncrypted));
    const base = String(client.apiUrl).replace(/\/$/, '');
    const snapUrl = `${base}/zyntel/v1/snapshot`;
    const res = await fetch(snapUrl, {
      headers: {
        'X-Zyntel-Key': key,
        'Accept': 'application/json',
      },
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json) {
      throw new Error(`Snapshot fetch failed (${res.status})`);
    }
    const payload = json?.success ? json.data : json;
    const metrics = payload?.metrics ?? payload;
    const snapshotAt = String(payload?.snapshot_at ?? payload?.snapshotAt ?? new Date().toISOString());
    const snapshotDate = snapshotAt.slice(0, 10);

    // Call our own ingest endpoint internally (no extra network hop)
    const ingest = await import('./ingest.ts');
    const fakeReq = new Request('http://local/api/roi/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Zyntel-Key': key },
      body: JSON.stringify({ serviceClientId, snapshotDate, metrics, source: 'api_pull' }),
    });
    const resp = await ingest.POST!({ request: fakeReq } as any);
    const out = await resp.json().catch(() => ({}));

    await updateServiceClient(serviceClientId, { roiLastSyncedAt: new Date(), roiLastSyncError: null });
    return new Response(JSON.stringify({ ok: true, snapshotDate, ingest: out }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    const msg = String(err?.message ?? 'Pull failed');
    await updateServiceClient(serviceClientId, { roiLastSyncError: msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

