import type { APIRoute } from 'astro';
import { generateWorkOrderPdf } from '../../../lib/work-order-pdf.ts';

export const GET: APIRoute = async ({ url, request }) => {
  try {
    const id = url.searchParams.get('id');
    if (!id) {
      return new Response(JSON.stringify({ error: 'id required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const baseUrl = new URL(request.url).origin;
    const pdfBytes = await generateWorkOrderPdf({ workOrderId: id, baseUrl });

    return new Response(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="work-order.pdf"`,
      },
    });
  } catch (err: any) {
    const status = err.message === 'Work order not found' ? 404 : 500;
    return new Response(JSON.stringify({ error: err.message ?? 'Server error' }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
