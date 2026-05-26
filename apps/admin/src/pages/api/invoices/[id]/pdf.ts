import type { APIRoute } from 'astro';
import { getInvoice, getPaymentAccount, getClient } from '@zyntel/db';
import { generateInvoicePdf } from '../../../../lib/invoice-pdf';

export const GET: APIRoute = async ({ params, request }) => {
  const id = Number(params.id);
  if (!id || isNaN(id)) {
    return new Response('Invalid invoice ID', { status: 400 });
  }
  try {
    const invoice = await getInvoice(id, true);
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
    const [paymentAccount, client] = await Promise.all([
      invoice.payment_account_id ? getPaymentAccount(invoice.payment_account_id) : Promise.resolve(null),
      invoice.client_id ? getClient(invoice.client_id) : Promise.resolve(null),
    ]);
    const clientBranding = client?.pdf_header_name || client?.pdf_footer_text
      ? { headerName: client.pdf_header_name, footerText: client.pdf_footer_text }
      : null;
    const prefix = (clientBranding?.headerName?.trim() || 'Zyntel').replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '');
    const pdfBytes = await generateInvoicePdf(invoice, { baseUrl, paymentAccount: paymentAccount ?? undefined, clientBranding });
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${prefix}-${invoice.invoice_number}.pdf"`,
      },
    });
  } catch (e) {
    console.error('Invoice PDF error:', e);
    return new Response('Server error', { status: 500 });
  }
};
