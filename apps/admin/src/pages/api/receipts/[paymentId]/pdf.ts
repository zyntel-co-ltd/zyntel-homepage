import type { APIRoute } from 'astro';
import { getInvoice, getPayment } from '@zyntel/db';
import { generateReceiptPdf } from '../../../../lib/invoice-pdf';

export const GET: APIRoute = async ({ params, request }) => {
  const paymentId = Number(params.paymentId);
  if (!paymentId || isNaN(paymentId)) {
    return new Response('Invalid payment ID', { status: 400 });
  }
  try {
    const payment = await getPayment(paymentId);
    if (!payment) {
      return new Response('Payment not found', { status: 404 });
    }
    const invoice = await getInvoice(payment.invoice_id);
    if (!invoice) {
      return new Response('Invoice not found', { status: 404 });
    }
    const baseUrl = new URL(request.url).origin;
    const pdfBytes = await generateReceiptPdf(invoice, payment, { baseUrl });
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Receipt-${invoice.invoice_number}-P${payment.id}.pdf"`,
      },
    });
  } catch (e) {
    console.error('Receipt PDF error:', e);
    return new Response('Server error', { status: 500 });
  }
};
