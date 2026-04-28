import type { APIRoute } from 'astro';
import { getQuoteById } from '../../../lib/quotes.ts';
import { generateQuotePdf } from '../../../lib/quote-pdf.ts';

export const GET: APIRoute = async ({ url }) => {
  try {
    const id = url.searchParams.get('id');
    if (!id) {
      return new Response(JSON.stringify({ error: 'id required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const quote = await getQuoteById(id);
    if (!quote) {
      return new Response(JSON.stringify({ error: 'Quote not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const baseUrl = import.meta.env.SITE_URL ?? import.meta.env.SITE ?? 'https://admin.zyntel.net';
    const pdfBytes = await generateQuotePdf(quote, { baseUrl });
    return new Response(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${quote.quoteNumber}.pdf"`,
        'Cache-Control': 'no-store, max-age=0',
        Pragma: 'no-cache',
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message ?? 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
