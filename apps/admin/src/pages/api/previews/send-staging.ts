import type { APIRoute } from 'astro';
import { getAdminClientEmailCc, sendEmail } from '../../../lib/email.ts';
import { getPreviewClientById, updatePreviewClient } from '../../../lib/previews.ts';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { clientId } = await request.json();
    if (!clientId) {
      return new Response(JSON.stringify({ error: 'clientId required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const client = await getPreviewClientById(String(clientId));
    if (!client) {
      return new Response(JSON.stringify({ error: 'Client not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    const SITE = import.meta.env.SITE_URL ?? 'https://admin.zyntel.net';
    const stagingLink = `${SITE}/p/staging?token=${client.token}`;

    const cc = (() => {
      const recordCc = getAdminClientEmailCc();
      if (!recordCc) return [];
      if (String(client.email).trim().toLowerCase() === recordCc.toLowerCase()) return [];
      return [recordCc];
    })();

    const { ok, error } = await sendEmail({
      to: client.email,
      subject: `Review link (staging) — ${client.name}`,
      html: `<!doctype html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb;margin:0;padding:28px 16px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:22px;">
    <p style="margin:0 0 10px;font-weight:800;color:#111;font-size:13px;">Zyntel</p>
    <h1 style="margin:0 0 10px;font-size:18px;color:#111;">Staging review link</h1>
    <p style="margin:0 0 16px;color:#374151;line-height:1.6;font-size:14px;">
      Hi, here is the latest staging review link for <strong>${client.name}</strong>.
    </p>
    <a href="${stagingLink}" style="display:inline-block;background:#111827;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700;font-size:14px;">
      Open staging review →
    </a>
    <p style="margin:16px 0 0;color:#6b7280;font-size:12px;line-height:1.6;">
      If the link says it is disabled, reply to this email and we will re-enable it for you.
    </p>
  </div>
</body>
</html>`,
    });

    if (!ok) {
      return new Response(JSON.stringify({ error: error ?? 'Failed to send' }), { status: 502, headers: { 'Content-Type': 'application/json' } });
    }

    await updatePreviewClient(client.clientId, {
      stagingEnabled: true,
      stagingSentAt: new Date(),
    });

    // CC is handled inside sendEmail(); it uses ADMIN_CLIENT_EMAIL_CC. Keep response informative.
    return new Response(JSON.stringify({ sent: true, to: client.email, link: stagingLink, cc }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message ?? 'Unknown error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

