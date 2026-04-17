import type { APIRoute } from 'astro';
import { getAdminClientEmailCc } from '../../../lib/email.ts';
import { getPreviewClientById } from '../../../lib/previews.ts';
import { Resend } from 'resend';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { clientId } = await request.json();
    if (!clientId) {
      return new Response(JSON.stringify({ error: 'clientId required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const client = await getPreviewClientById(clientId);
    if (!client) {
      return new Response(JSON.stringify({ error: 'Client not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const SITE = import.meta.env.SITE_URL ?? 'https://admin.zyntel.net';
    const previewUrl = `${SITE}/p/${client.token}`;
    const expiryFormatted = new Date(client.expiryDate).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const resendApiKey = String(import.meta.env.RESEND_API_KEY ?? '').trim();
    // Prefer RESEND_FROM_EMAIL, but fall back to EMAIL_FROM (used by invoices/receipts),
    // and finally a safe default that matches existing verified sender patterns.
    const fromEmail =
      String(import.meta.env.RESEND_FROM_EMAIL ?? '').trim() ||
      String(import.meta.env.EMAIL_FROM ?? '').trim() ||
      'Zyntel <billing@zyntel.net>';
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: 'RESEND_API_KEY must be configured (Vercel env var)' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }
    // fromEmail always has a default; keep request path resilient and let Resend validate it.

    const resend = new Resend(resendApiKey);
    const recordCc = getAdminClientEmailCc();
    const cc =
      recordCc && String(client.email).trim().toLowerCase() !== recordCc.toLowerCase()
        ? [recordCc]
        : [];

    const { error } = await resend.emails.send({
      from: fromEmail,
      to: client.email,
      ...(cc.length ? { cc } : {}),
      subject: `Your design preview is ready — ${client.name}`,
      html: `<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9f9f9;margin:0;padding:40px 20px;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:36px;border:1px solid #e5e7eb;">
    <p style="font-size:13px;font-weight:800;color:#111;margin:0 0 20px;">Zyntel</p>
    <h1 style="font-size:20px;font-weight:700;color:#111;margin:0 0 8px;">Your design preview is ready</h1>
    <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 16px;">
      Hi, we have prepared your website design options for <strong>${client.name}</strong>.
    </p>
    <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 24px;">
      Click the button below to view all three design options. Each one is complete and ready to build — scroll through them, use the comparison table, and answer the three questions at the bottom to find the best fit. Then send us your choice and we will begin building immediately.
    </p>
    <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:14px 16px;margin:0 0 20px;">
      <p style="font-size:13px;font-weight:700;color:#92400e;margin:0 0 4px;">
        📺 Best viewed on a computer
      </p>
      <p style="font-size:13px;color:#78350f;line-height:1.6;margin:0;">
        The design presentation is built for a desktop or laptop screen so you can
        see the full detail of each option. If you are reading this on your phone,
        please forward this email to yourself and open it on a computer before clicking
        the button below.
      </p>
    </div>
    <a href="${previewUrl}"
       style="display:inline-block;background:#C63527;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:700;letter-spacing:.01em;">
      View your design options →
    </a>
    <div style="margin:28px 0 0;padding:16px;background:#f9f9f9;border-radius:8px;border:1px solid #e5e7eb;">
      <p style="font-size:12px;font-weight:700;color:#333;margin:0 0 6px;">How to review your designs</p>
      <p style="font-size:12px;color:#666;line-height:1.6;margin:0;">
        1. Open the link above<br>
        2. Review the comparison table — it shows exactly how the three options differ<br>
        3. Click "Explore Option X in full" to scroll through each complete design<br>
        4. Answer the three questions at the bottom to get our recommendation<br>
        5. Click "I've made my choice — let's build it" to send us your decision
      </p>
    </div>
    <p style="color:#999;font-size:12px;margin:20px 0 4px;">
      This link is private to you and expires on ${expiryFormatted}.
    </p>
    <p style="color:#999;font-size:12px;margin:0 0 20px;">
      Questions? Reply to this email or reach us at hello@zyntel.net
    </p>
    <hr style="border:none;border-top:1px solid #f0f0f0;margin:0 0 16px;">
    <p style="color:#bbb;font-size:11px;margin:0;">Zyntel Limited · Kampala, Uganda · zyntel.net</p>
  </div>
</body>
</html>`,
    });

    if (error) {
      // Resend commonly returns 422 for invalid/unverified `from`
      const msg = String(error.message ?? 'Resend error');
      const isValidation = /422|validation|from/i.test(msg);
      return new Response(JSON.stringify({
        error: msg,
        hint: isValidation
          ? 'Resend rejected the request (often: RESEND_FROM_EMAIL not verified / invalid). Check Resend Domains + Sender and update Vercel env vars.'
          : undefined
      }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ sent: true, to: client.email }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message ?? 'Unknown error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
