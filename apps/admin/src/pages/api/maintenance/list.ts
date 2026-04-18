import type { APIRoute } from 'astro';
import { listMaintenanceClients } from '@zyntel/db';

export const GET: APIRoute = async ({ request }) => {
  const apiKey = request.headers.get('x-api-key') ?? request.headers.get('authorization')?.replace('Bearer ', '');
  if (import.meta.env.INVOICE_API_KEY && apiKey !== import.meta.env.INVOICE_API_KEY) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  try {
    const clients = await listMaintenanceClients();
    return new Response(JSON.stringify({ ok: true, clients }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('List maintenance clients error:', e);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
};
