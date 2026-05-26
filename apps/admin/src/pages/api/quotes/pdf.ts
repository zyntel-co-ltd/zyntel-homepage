import type { APIRoute } from 'astro';
import { getQuoteById } from '../../../lib/quotes.ts';
import { generateQuotePdf } from '../../../lib/quote-pdf.ts';
import { getClient } from '@zyntel/db';

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
    const client = quote.clientId ? await getClient(quote.clientId) : null;
    const clientBranding = client?.pdf_header_name || client?.pdf_footer_text
      ? { headerName: client.pdf_header_name, footerText: client.pdf_footer_text }
      : null;
    const prefix = (clientBranding?.headerName?.trim() || 'Zyntel').replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '');
    const pdfBytes = await generateQuotePdf(quote, { baseUrl, clientBranding });
    return new Response(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${prefix}-${quote.quoteNumber}.pdf"`,
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
