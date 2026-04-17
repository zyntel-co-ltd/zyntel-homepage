import type { APIRoute } from 'astro';
import { createSnapshot, getSnapshots } from '../../../lib/roi.ts';

export const GET: APIRoute = async ({ url }) => {
  try {
    const clientId = url.searchParams.get('serviceClientId');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    if (!clientId || !from || !to) {
      return new Response(JSON.stringify({ error: 'serviceClientId, from, and to required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const snapshots = await getSnapshots(clientId, from, to);
    return new Response(JSON.stringify(snapshots), { headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message ?? 'Server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    if (!body.serviceClientId || !body.snapshotDate || !body.metricKey || body.metricValue == null) {
      return new Response(JSON.stringify({ error: 'serviceClientId, snapshotDate, metricKey, metricValue required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const snapshot = await createSnapshot(body);
    return new Response(JSON.stringify(snapshot), { status: 201, headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message ?? 'Server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
