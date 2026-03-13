import type { APIRoute } from 'astro';
import { listInvoices } from '../../../lib/db';

export const GET: APIRoute = async ({ request }) => {
  const apiKey = request.headers.get('x-api-key') ?? request.headers.get('authorization')?.replace('Bearer ', '');
  const expectedKey = import.meta.env.INVOICE_API_KEY;
  if (expectedKey && apiKey !== expectedKey) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  try {
    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get('limit')) || 50, 100);
    const invoices = await listInvoices(limit);
    return new Response(JSON.stringify({ ok: true, invoices }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('List invoices error:', e);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
};
