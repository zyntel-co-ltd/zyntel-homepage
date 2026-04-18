import type { APIRoute } from 'astro';
import { getMaintenanceClient, listAppMetrics } from '@zyntel/db';

export const GET: APIRoute = async ({ request, params }) => {
  const apiKey = request.headers.get('x-api-key') ?? request.headers.get('authorization')?.replace('Bearer ', '');
  if (import.meta.env.INVOICE_API_KEY && apiKey !== import.meta.env.INVOICE_API_KEY) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  const id = parseInt(params.id ?? '');
  if (isNaN(id)) return new Response(JSON.stringify({ error: 'Invalid id' }), { status: 400 });
  try {
    const client = await getMaintenanceClient(id);
    if (!client) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
    const metrics = await listAppMetrics(id);
    return new Response(JSON.stringify({ ok: true, client, metrics }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Get maintenance client error:', e);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
};
