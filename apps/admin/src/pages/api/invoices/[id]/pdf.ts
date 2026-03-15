import type { APIRoute } from 'astro';
import { getInvoice, getPaymentAccount } from '@zyntel/db';
import { generateInvoicePdf } from '../../../../lib/invoice-pdf';

export const GET: APIRoute = async ({ params, request }) => {
  const id = Number(params.id);
  if (!id || isNaN(id)) {
    return new Response('Invalid invoice ID', { status: 400 });
  }
  try {
    const invoice = await getInvoice(id);
    if (!invoice) {
      return new Response('Invoice not found', { status: 404 });
    }
    if (invoice.status === 'draft') {
      return new Response(JSON.stringify({ error: 'Draft invoices cannot be downloaded. Finalize the invoice first.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const baseUrl = new URL(request.url).origin;
    const paymentAccount = invoice.payment_account_id ? await getPaymentAccount(invoice.payment_account_id) : null;
    const pdfBytes = await generateInvoicePdf(invoice, { baseUrl, paymentAccount: paymentAccount ?? undefined });
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
