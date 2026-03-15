import type { APIRoute } from 'astro';
import { createClient } from '@zyntel/db';

export const POST: APIRoute = async ({ request }) => {
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
    if (!name?.trim() || !email?.trim()) {
      return new Response(JSON.stringify({ error: 'name and email required' }), { status: 400 });
    }
    const client = await createClient({
      name: String(name).trim(),
      email: String(email).trim(),
      phone: phone ? String(phone).trim() : undefined,
      address: address ? String(address).trim() : undefined,
    });
    if (!client) {
      return new Response(JSON.stringify({ error: 'Database error' }), { status: 500 });
    }
    return new Response(JSON.stringify({ ok: true, client }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Create client error:', e);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
};
