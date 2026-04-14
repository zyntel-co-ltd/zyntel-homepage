import type { APIRoute } from 'astro';
import { getInvoice, getPayment } from '@zyntel/db';
import { generateReceiptPdf } from '../../../../lib/invoice-pdf';
import { sendEmail } from '../../../../lib/email';

export const POST: APIRoute = async ({ params, request }) => {
  const paymentId = Number(params.paymentId);
  if (!paymentId || isNaN(paymentId)) {
    return new Response(JSON.stringify({ error: 'Invalid payment ID' }), { status: 400 });
  }
  const apiKey = request.headers.get('x-api-key') ?? request.headers.get('authorization')?.replace('Bearer ', '');
  const expectedKey = import.meta.env.INVOICE_API_KEY;
  if (expectedKey && apiKey !== expectedKey) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  if (!String(import.meta.env.RESEND_API_KEY ?? '').trim()) {
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY must be configured' }), { status: 503 });
  }
  let body: { to?: string } = {};
  if (request.headers.get('content-type')?.includes('application/json')) {
    try {
      body = (await request.json()) as typeof body;
    } catch {
      body = {};
    }
  }
  try {
    const payment = await getPayment(paymentId);
    if (!payment) {
      return new Response(JSON.stringify({ error: 'Payment not found' }), { status: 404 });
    }
    const invoice = await getInvoice(payment.invoice_id);
    if (!invoice) {
      return new Response(JSON.stringify({ error: 'Invoice not found' }), { status: 404 });
    }
    const toAddr = (body.to?.trim() || invoice.client_email?.trim() || '').trim();
    if (!toAddr) {
      return new Response(JSON.stringify({ error: 'Invoice has no client email. Add an email to send receipt.' }), { status: 400 });
    }
    const baseUrl = new URL(request.url).origin;
    const pdfBytes = await generateReceiptPdf(invoice, payment, { baseUrl });
    const result = await sendEmail({
      to: toAddr,
      subject: `Payment Receipt - Invoice ${invoice.invoice_number}`,
      html: `
        <p>Dear ${invoice.client_name},</p>
        <p>Thank you for your payment. Please find your receipt attached.</p>
        <p>Amount: ${invoice.currency} ${Number(payment.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
        <p>Method: ${payment.payment_method.replace('_', ' ')}</p>
        <p>Thank you,<br>Zyntel</p>
      `,
      attachments: [{ filename: `Receipt-${invoice.invoice_number}-P${payment.id}.pdf`, content: Buffer.from(pdfBytes) }],
    });
    if (!result.ok) {
      return new Response(JSON.stringify({ error: result.error ?? 'Failed to send email' }), { status: 400 });
    }
    return new Response(JSON.stringify({ ok: true, messageId: result.messageId }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Send receipt error:', e);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
};
