import type { APIRoute } from 'astro';
import { convertQuoteToInvoice } from '../../../lib/quotes.ts';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { quoteId } = body;
    if (!quoteId) {
      return new Response(JSON.stringify({ error: 'quoteId required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const result = await convertQuoteToInvoice(quoteId);
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    const status = err.message === 'Quote not found' ? 404 : 500;
    return new Response(JSON.stringify({ error: err.message ?? 'Server error' }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
