import type { APIRoute } from 'astro';
import { createMaintenanceClient } from '@zyntel/db';

export const POST: APIRoute = async ({ request }) => {
  const apiKey = request.headers.get('x-api-key') ?? request.headers.get('authorization')?.replace('Bearer ', '');
  if (import.meta.env.INVOICE_API_KEY && apiKey !== import.meta.env.INVOICE_API_KEY) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  try {
    const body = await request.json();
    if (!body.name || !body.app_name) {
      return new Response(JSON.stringify({ error: 'name and app_name are required' }), { status: 400 });
    }
    const client = await createMaintenanceClient(body);
    return new Response(JSON.stringify({ ok: true, client }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Create maintenance client error:', e);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
};
