import type { APIRoute } from 'astro';
import { getQuoteById } from '../../../lib/quotes.ts';
import { generateQuotePdf } from '../../../lib/quote-pdf.ts';
import { sendEmail } from '../../../lib/email.ts';
import { updateClient } from '@zyntel/db';

function parseDateOnly(dateStr: string): Date | null {
  const s = String(dateStr).trim();
  if (!s) return null;
  const d = new Date(`${s.slice(0, 10)}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json().catch(() => ({} as any));
    const quoteId = body?.quoteId;
    const to = typeof body?.to === 'string' ? body.to.trim() : '';
    const clientEmails = Array.isArray(body?.client_emails)
      ? body.client_emails.map((e: unknown) => String(e).trim()).filter(Boolean)
      : [];
    if (!quoteId) {
      return new Response(JSON.stringify({ error: 'quoteId required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const quote = await getQuoteById(quoteId);
    if (!quote) {
      return new Response(JSON.stringify({ error: 'Quote not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (quote.clientId && clientEmails.length > 0) {
      // Persist contact emails for next time.
      await updateClient(quote.clientId, { emails: clientEmails });
    }

    const fallback = clientEmails[0] ?? quote.clientEmail?.trim() ?? '';
    const toAddr = (to || fallback).trim();
    if (!toAddr) {
      return new Response(JSON.stringify({ error: 'Add at least one email to send.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const baseUrl = import.meta.env.SITE_URL ?? import.meta.env.SITE ?? 'https://admin.zyntel.net';
    const pdfBytes = await generateQuotePdf(quote, { baseUrl });
    const pdfBuffer = Buffer.from(pdfBytes);

    const validUntilDate = quote.validUntil ? parseDateOnly(quote.validUntil) : null;
    const validUntilFormatted = validUntilDate
      ? validUntilDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      : 'as specified';

    const totalFormatted = `${quote.currency} ${Number(quote.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

    const result = await sendEmail({
      to: toAddr,
      subject: `Quote ${quote.quoteNumber} from Zyntel — ${quote.title}`,
      html: `<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9f9f9;margin:0;padding:40px 20px;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:36px;border:1px solid #e5e7eb;">
    <p style="font-size:13px;font-weight:800;color:#111;margin:0 0 20px;">Zyntel</p>
    <h1 style="font-size:20px;font-weight:700;color:#111;margin:0 0 8px;">Your quote is ready</h1>
    <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 16px;">
      Hi ${quote.clientName ?? 'there'}, please find attached our quote for <strong>${quote.title}</strong>.
    </p>
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:0 0 20px;">
      <table style="width:100%;font-size:13px;border-collapse:collapse;">
        <tr><td style="color:#6b7280;padding:4px 0;">Quote No.</td><td style="font-weight:700;text-align:right;">${quote.quoteNumber}</td></tr>
        <tr><td style="color:#6b7280;padding:4px 0;">Scope</td><td style="font-weight:600;text-align:right;">${quote.title}</td></tr>
        <tr><td style="color:#6b7280;padding:4px 0;">Total</td><td style="font-weight:700;color:#111;text-align:right;font-size:15px;">${totalFormatted}</td></tr>
        <tr><td style="color:#6b7280;padding:4px 0;">Valid Until</td><td style="font-weight:600;text-align:right;">${validUntilFormatted}</td></tr>
      </table>
    </div>
    <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 20px;">
      The full quote is attached as a PDF. To accept, simply reply to this email or contact us at <a href="mailto:hello@zyntel.net" style="color:#635bff;">hello@zyntel.net</a>. Once accepted, we will begin work and issue a formal invoice.
    </p>
    <p style="color:#999;font-size:12px;margin:0 0 4px;">Questions? Reply to this email or reach us at hello@zyntel.net</p>
    <hr style="border:none;border-top:1px solid #f0f0f0;margin:16px 0;">
    <p style="color:#bbb;font-size:11px;margin:0;">Zyntel Co. Limited · P.O Box 860954 · zyntel.net · info@zyntel.net · 0786421061</p>
  </div>
</body>
</html>`,
      attachments: [
        { filename: `${quote.quoteNumber}.pdf`, content: pdfBuffer },
      ],
    });

    if (!result.ok) {
      return new Response(JSON.stringify({ error: result.error ?? 'Failed to send email' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ sent: true, to: toAddr }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message ?? 'Unknown error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
