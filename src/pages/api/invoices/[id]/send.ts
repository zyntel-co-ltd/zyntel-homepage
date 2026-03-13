import type { APIRoute } from 'astro';
import { getInvoice, updateInvoiceStatus, getPaymentAccount } from '../../../../lib/db';
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
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  const gmailUser = import.meta.env.GMAIL_USER;
  if (!gmailUser) {
    return new Response(JSON.stringify({ error: 'GMAIL_USER and GMAIL_APP_PASSWORD must be configured' }), { status: 503 });
  }
  try {
    const invoice = await getInvoice(id);
    if (!invoice) {
      return new Response(JSON.stringify({ error: 'Invoice not found' }), { status: 404 });
    }
    if (invoice.status === 'draft') {
      return new Response(JSON.stringify({ error: 'Draft invoices cannot be sent. Finalize the invoice first.' }), { status: 403 });
    }
    const baseUrl = new URL(request.url).origin;
    const paymentAccount = invoice.payment_account_id ? await getPaymentAccount(invoice.payment_account_id) : null;
    const pdfBytes = await generateInvoicePdf(invoice, { baseUrl, paymentAccount: paymentAccount ?? undefined });
    const result = await sendEmail({
      to: invoice.client_email,
      subject: `Invoice ${invoice.invoice_number} from Zyntel`,
      html: `
        <p>Dear ${invoice.client_name},</p>
        <p>Please find your invoice #${invoice.invoice_number} attached.</p>
        <p>Total: ${invoice.currency} ${invoice.total.toLocaleString()}</p>
        <p>Thank you,<br>Zyntel</p>
      `,
      attachments: [{ filename: `invoice-${invoice.invoice_number}.pdf`, content: Buffer.from(pdfBytes) }],
    });
    if (!result.ok) {
      return new Response(JSON.stringify({ error: result.error ?? 'Failed to send email' }), { status: 400 });
    }
    if (invoice.status === 'draft') {
      await updateInvoiceStatus(id, 'sent');
    }
    return new Response(JSON.stringify({ ok: true, messageId: result.messageId }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Send invoice error:', e);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
};
