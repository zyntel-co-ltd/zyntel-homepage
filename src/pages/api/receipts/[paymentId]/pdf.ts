import type { APIRoute } from 'astro';
import { neon } from '@neondatabase/serverless';
import { getInvoice } from '../../../../lib/db';
import { generateReceiptPdf } from '../../../../lib/invoice-pdf';
import type { PaymentRecord } from '../../../../lib/db';

export const GET: APIRoute = async ({ params }) => {
  const paymentId = Number(params.paymentId);
  if (!paymentId || isNaN(paymentId)) {
    return new Response('Invalid payment ID', { status: 400 });
  }
  try {
    const sql = neon(import.meta.env.DATABASE_URL ?? '');
    const paymentRows = await sql`SELECT * FROM payment_records WHERE id = ${paymentId}`;
    const payment = paymentRows[0] as PaymentRecord | undefined;
    if (!payment) {
      return new Response('Payment not found', { status: 404 });
    }
    const invoice = await getInvoice(payment.invoice_id);
    if (!invoice) {
      return new Response('Invoice not found', { status: 404 });
    }
    const pdfBytes = await generateReceiptPdf(invoice, payment);
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="receipt-${invoice.invoice_number}.pdf"`,
      },
    });
  } catch (e) {
    console.error('Receipt PDF error:', e);
    return new Response('Server error', { status: 500 });
  }
};
