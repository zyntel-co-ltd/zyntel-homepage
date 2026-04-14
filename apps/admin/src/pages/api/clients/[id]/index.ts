import type { APIRoute } from 'astro';
import { getClient } from '@zyntel/db';

export const GET: APIRoute = async ({ params, request }) => {
  const id = Number(params.id);
  if (!id || isNaN(id)) {
    return new Response(JSON.stringify({ error: 'Invalid client ID' }), { status: 400 });
  }
  const apiKey = request.headers.get('x-api-key') ?? request.headers.get('authorization')?.replace('Bearer ', '');
  const expectedKey = import.meta.env.INVOICE_API_KEY;
  if (expectedKey && apiKey !== expectedKey) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  try {
    const client = await getClient(id);
    if (!client) {
      return new Response(JSON.stringify({ error: 'Client not found' }), { status: 404 });
    }
    return new Response(JSON.stringify({ ok: true, client }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Get client error:', e);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
};
