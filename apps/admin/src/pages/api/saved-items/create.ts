import type { APIRoute } from 'astro';
import { createSavedItem } from '@zyntel/db';

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
    const { name, description, unit_price, default_quantity } = body ?? {};
    if (!name?.trim() || !description?.trim()) {
      return new Response(JSON.stringify({ error: 'name and description required' }), { status: 400 });
    }
    const item = await createSavedItem({
      name: String(name).trim(),
      description: String(description).trim(),
      unit_price: Number(unit_price) || 0,
      default_quantity: default_quantity != null ? Number(default_quantity) : 1,
    });
    if (!item) {
      return new Response(JSON.stringify({ error: 'Failed to create' }), { status: 500 });
    }
    return new Response(JSON.stringify({ ok: true, item }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Create saved item error:', e);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
};
