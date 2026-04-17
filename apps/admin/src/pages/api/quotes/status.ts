import type { APIRoute } from 'astro';
import { updateQuoteStatus } from '../../../lib/quotes.ts';
import type { QuoteStatus } from '@zyntel/db/schema';

const VALID_STATUSES: QuoteStatus[] = ['draft', 'sent', 'accepted', 'declined', 'converted'];

export const PUT: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { quoteId, status } = body;
    if (!quoteId || !status) {
      return new Response(JSON.stringify({ error: 'quoteId and status required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (!VALID_STATUSES.includes(status as QuoteStatus)) {
      return new Response(JSON.stringify({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const quote = await updateQuoteStatus(quoteId, status as QuoteStatus);
    return new Response(JSON.stringify(quote), {
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
