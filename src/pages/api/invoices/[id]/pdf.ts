import type { APIRoute } from 'astro';
import { getInvoice } from '../../../../lib/db';
import { generateInvoicePdf } from '../../../../lib/invoice-pdf';

export const GET: APIRoute = async ({ params }) => {
  const id = Number(params.id);
  if (!id || isNaN(id)) {
    return new Response('Invalid invoice ID', { status: 400 });
  }
  try {
    const invoice = await getInvoice(id);
    if (!invoice) {
      return new Response('Invoice not found', { status: 404 });
    }
    const pdfBytes = await generateInvoicePdf(invoice);
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${invoice.invoice_number}.pdf"`,
      },
    });
  } catch (e) {
    console.error('Invoice PDF error:', e);
    return new Response('Server error', { status: 500 });
  }
};
