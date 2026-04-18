import type { APIRoute } from 'astro';
import { listAppMetrics, upsertAppMetric, getMaintenanceClient } from '@zyntel/db';

function auth(request: Request): boolean {
  const key = request.headers.get('x-api-key') ?? request.headers.get('authorization')?.replace('Bearer ', '');
  return !import.meta.env.INVOICE_API_KEY || key === import.meta.env.INVOICE_API_KEY;
}

export const GET: APIRoute = async ({ request, params }) => {
  if (!auth(request)) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const id = parseInt(params.id ?? '');
  if (isNaN(id)) return new Response(JSON.stringify({ error: 'Invalid id' }), { status: 400 });
  try {
    const metrics = await listAppMetrics(id);
    return new Response(JSON.stringify({ ok: true, metrics }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
};

export const POST: APIRoute = async ({ request, params }) => {
  if (!auth(request)) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const id = parseInt(params.id ?? '');
  if (isNaN(id)) return new Response(JSON.stringify({ error: 'Invalid id' }), { status: 400 });
  try {
    const body = await request.json();

    // If client has a metrics_api_url, try to fetch live data first
    const client = await getMaintenanceClient(id);
    let liveData: Record<string, unknown> = {};
    if (client?.metrics_api_url && body.auto_sync) {
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (client.metrics_api_key) headers['x-api-key'] = client.metrics_api_key;
        const r = await fetch(client.metrics_api_url, { headers });
        if (r.ok) {
          liveData = await r.json();
          body.auto_synced = true;
        }
      } catch {
        // fall through to manual data
      }
    }

    const merged = { ...liveData, ...body, maintenance_client_id: id };
    if (!merged.period) {
      // Default to first of current month
      const now = new Date();
      merged.period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    }

    const metric = await upsertAppMetric(merged as Parameters<typeof upsertAppMetric>[0]);
    return new Response(JSON.stringify({ ok: true, metric }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Upsert metric error:', e);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
};
