import type { APIRoute } from 'astro';
import { getInvoice, getPaymentAccount, patchInvoiceClientEmail, updateClient } from '@zyntel/db';
import { generateInvoicePdf } from '../../../../lib/invoice-pdf';
import { sendEmail } from '../../../../lib/email';

export const POST: APIRoute = async ({ params, request }) => {
  const id = Number(params.id);
  if (!id || isNaN(id)) {
    return new Response(JSON.stringify({ error: 'Invalid invoice ID' }), { status: 400 });
  }
  const apiKey = request.headers.get('x-api-key') ?? request.headers.get('authorization')?.replace('Bearer ', '');
  const expectedKey = import.meta.env.INVOICE_API_KEY;
  if (expectedKey && apiKey !== expectedKey) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }
  if (!String(import.meta.env.RESEND_API_KEY ?? '').trim()) {
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY must be configured' }), { status: 503 });
  }
  let body: { to?: string; client_emails?: string[] } = {};
  if (request.headers.get('content-type')?.includes('application/json')) {
    try {
      body = (await request.json()) as typeof body;
    } catch {
      body = {};
    }
  }
  try {
    const invoice = await getInvoice(id);
    if (!invoice) {
      return new Response(JSON.stringify({ error: 'Invoice not found' }), { status: 404 });
    }
    if (invoice.status === 'draft') {
      return new Response(JSON.stringify({ error: 'Draft invoices cannot be sent. Finalize the invoice first.' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }
    const clientEmails = Array.isArray(body.client_emails)
      ? body.client_emails.map((e) => String(e).trim()).filter(Boolean)
      : [];
    if (invoice.client_id && clientEmails.length > 0) {
      await updateClient(invoice.client_id, { emails: clientEmails });
    }
    const fallback = clientEmails[0] ?? invoice.client_email?.trim() ?? '';
    const toAddr = (body.to?.trim() || fallback).trim();
    if (!toAddr) {
      return new Response(JSON.stringify({ error: 'Add at least one email to send.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    await patchInvoiceClientEmail(id, toAddr);
    const invoiceForPdf = (await getInvoice(id)) ?? invoice;
    const baseUrl = new URL(request.url).origin;
    const paymentAccount = invoiceForPdf.payment_account_id ? await getPaymentAccount(invoiceForPdf.payment_account_id) : null;
    const pdfBytes = await generateInvoicePdf(invoiceForPdf, { baseUrl, paymentAccount: paymentAccount ?? undefined });
    const result = await sendEmail({
      to: toAddr,
      subject: `Invoice ${invoiceForPdf.invoice_number} from Zyntel`,
      html: `
        <p>Dear ${invoiceForPdf.client_name},</p>
        <p>Please find your invoice #${invoiceForPdf.invoice_number} attached.</p>
        <p>Total: ${invoiceForPdf.currency} ${invoiceForPdf.total.toLocaleString()}</p>
        <p>Thank you,<br>Zyntel</p>
      `,
      attachments: [{ filename: `Invoice-${invoiceForPdf.invoice_number}.pdf`, content: Buffer.from(pdfBytes) }],
    });
    if (!result.ok) {
      return new Response(JSON.stringify({ error: result.error ?? 'Failed to send email' }), { status: 400 });
    }
    return new Response(JSON.stringify({ ok: true, messageId: result.messageId, invoice: invoiceForPdf }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Send invoice error:', e);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
};
