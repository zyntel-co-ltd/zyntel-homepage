import type { APIRoute } from 'astro';
import { listPaymentAccounts } from '../../../lib/db';

export const GET: APIRoute = async ({ request }) => {
  const apiKey = request.headers.get('x-api-key') ?? request.headers.get('authorization')?.replace('Bearer ', '');
  const expectedKey = import.meta.env.INVOICE_API_KEY;
  if (expectedKey && apiKey !== expectedKey) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  try {
    const accounts = await listPaymentAccounts();
    return new Response(JSON.stringify({ ok: true, accounts }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('List payment accounts error:', e);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
};
