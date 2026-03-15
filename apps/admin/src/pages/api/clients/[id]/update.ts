import type { APIRoute } from 'astro';
import { updateClient } from '@zyntel/db';

export const PATCH: APIRoute = async ({ params, request }) => {
  const id = Number(params.id);
  if (!id || isNaN(id)) {
    return new Response(JSON.stringify({ error: 'Invalid client ID' }), { status: 400 });
  }
  if (request.headers.get('content-type') !== 'application/json') {
    return new Response(JSON.stringify({ error: 'Expect JSON' }), { status: 400 });
  }
  const apiKey = request.headers.get('x-api-key') ?? request.headers.get('authorization')?.replace('Bearer ', '');
  const expectedKey = import.meta.env.INVOICE_API_KEY;
  if (expectedKey && apiKey !== expectedKey) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  try {
    const body = await request.json();
    const { name, email, phone, address } = body ?? {};
    const client = await updateClient(id, {
      name: name != null ? String(name).trim() : undefined,
      email: email != null ? String(email).trim() : undefined,
      phone: phone !== undefined ? (phone ? String(phone).trim() : null) : undefined,
      address: address !== undefined ? (address ? String(address).trim() : null) : undefined,
    });
    if (!client) {
      return new Response(JSON.stringify({ error: 'Client not found or invalid data' }), { status: 400 });
    }
    return new Response(JSON.stringify({ ok: true, client }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Update client error:', e);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
};
