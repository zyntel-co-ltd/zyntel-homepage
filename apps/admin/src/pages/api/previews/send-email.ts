import type { APIRoute } from 'astro';
import { getPreviewClientById } from '../../../lib/previews.ts';
import { Resend } from 'resend';

export const POST: APIRoute = async ({ request }) => {
  const { clientId } = await request.json();
  if (!clientId) return new Response(JSON.stringify({ error: 'clientId required' }), { status: 400 });

  const client = await getPreviewClientById(clientId);
  if (!client) return new Response(JSON.stringify({ error: 'Client not found' }), { status: 404 });

  const SITE = import.meta.env.SITE_URL ?? 'https://admin.zyntel.net';
  const previewUrl = `${SITE}/p/${client.token}`;
  const expiryFormatted = new Date(client.expiryDate).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  const apiKey = String(import.meta.env.RESEND_API_KEY ?? '').trim();
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY must be set' }), { status: 500 });
  }
  const from = String(import.meta.env.EMAIL_FROM ?? '').trim() || 'Zyntel <billing@zyntel.net>';
  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({
    from,
    to: client.email,
    subject: `Your design preview is ready — ${client.name}`,
    html: `<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,sans-serif;background:#f9f9f9;margin:0;padding:40px 20px;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:36px;border:1px solid #e5e7eb;">
    <p style="font-size:13px;font-weight:800;color:#111;margin:0 0 20px;">Zyntel</p>
    <h1 style="font-size:20px;font-weight:700;color:#111;margin:0 0 8px;">Your design preview is ready</h1>
    <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 24px;">
      We've prepared your design options for <strong>${client.name}</strong>.
      Click the button below to review them at your own pace.
    </p>
    <a href="${previewUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;
       padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">
      View your designs →
    </a>
    <p style="color:#999;font-size:12px;margin:20px 0 0;">
      This link is private to you and expires ${expiryFormatted}. Do not share it.
    </p>
    <p style="color:#999;font-size:12px;margin:4px 0 0;">
      Questions? Reply to this email or contact us at hello@zyntel.net
    </p>
    <hr style="border:none;border-top:1px solid #f0f0f0;margin:20px 0;"/>
    <p style="color:#ccc;font-size:11px;margin:0;">Zyntel Limited · Kampala, Uganda · zyntel.net</p>
  </div>
</body>
</html>`
  });

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify({ sent: true }), { headers: { 'Content-Type': 'application/json' } });
};
