import type { APIRoute } from 'astro';
import { submitPreviewChoiceByToken } from '../../lib/previews.ts';
import { sendEmail } from '../../lib/email.ts';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const token = String(body?.token ?? '').trim();
    const choiceOption = String(body?.choiceOption ?? '').trim().toUpperCase();
    const choiceComments = String(body?.choiceComments ?? '').trim();
    const q1 = body?.q1 != null ? String(body.q1).trim() : null;
    const q2 = body?.q2 != null ? String(body.q2).trim() : null;
    const q3 = body?.q3 != null ? String(body.q3).trim() : null;
    const recommended = body?.recommended != null ? String(body.recommended).trim().toUpperCase() : null;

    if (!token) {
      return new Response(JSON.stringify({ error: 'token required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (!['A', 'B', 'C'].includes(choiceOption)) {
      return new Response(JSON.stringify({ error: 'choiceOption must be A, B, or C' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (!choiceComments) {
      return new Response(JSON.stringify({ error: 'choiceComments required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const client = await submitPreviewChoiceByToken({
      token,
      choiceOption: choiceOption as 'A' | 'B' | 'C',
      choiceComments,
      choiceAnswers: { q1, q2, q3, recommended },
    });

    // Notify ops inbox (best-effort; don't fail the client submission on email errors).
    try {
      const SITE = import.meta.env.SITE_URL ?? 'https://admin.zyntel.net';
      const previewUrl = `${SITE}/p/${client.token}`;
      const html = `<!doctype html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb;margin:0;padding:24px;">
  <div style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;">
    <h2 style="margin:0 0 12px;font-size:18px;color:#111;">Client design review feedback submitted</h2>
    <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.6;">
      <strong>${client.name}</strong> (${client.clientId}) submitted feedback for their design preview.
    </p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0;">
      <div style="border:1px solid #e5e7eb;border-radius:10px;padding:10px;">
        <div style="font-size:11px;color:#6b7280;font-weight:700;letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px;">Selected option</div>
        <div style="font-size:14px;font-weight:700;color:#111;">${client.choiceOption ?? choiceOption}</div>
      </div>
      <div style="border:1px solid #e5e7eb;border-radius:10px;padding:10px;">
        <div style="font-size:11px;color:#6b7280;font-weight:700;letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px;">Decision guide recommended</div>
        <div style="font-size:14px;font-weight:700;color:#111;">${recommended || '—'}</div>
      </div>
      <div style="border:1px solid #e5e7eb;border-radius:10px;padding:10px;">
        <div style="font-size:11px;color:#6b7280;font-weight:700;letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px;">Q1 feeling</div>
        <div style="font-size:13px;color:#111;">${q1 || '—'}</div>
      </div>
      <div style="border:1px solid #e5e7eb;border-radius:10px;padding:10px;">
        <div style="font-size:11px;color:#6b7280;font-weight:700;letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px;">Q2 founders</div>
        <div style="font-size:13px;color:#111;">${q2 || '—'}</div>
      </div>
      <div style="border:1px solid #e5e7eb;border-radius:10px;padding:10px;">
        <div style="font-size:11px;color:#6b7280;font-weight:700;letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px;">Q3 quote placement</div>
        <div style="font-size:13px;color:#111;">${q3 || '—'}</div>
      </div>
      <div style="border:1px solid #e5e7eb;border-radius:10px;padding:10px;">
        <div style="font-size:11px;color:#6b7280;font-weight:700;letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px;">Client email</div>
        <div style="font-size:13px;color:#111;">${client.email}</div>
      </div>
    </div>
    <div style="border:1px solid #e5e7eb;border-radius:10px;padding:10px;margin-top:10px;">
      <div style="font-size:11px;color:#6b7280;font-weight:700;letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px;">Comments</div>
      <div style="font-size:13px;color:#111;white-space:pre-wrap;line-height:1.6;">${(client.choiceComments ?? choiceComments).replace(/</g,'&lt;')}</div>
    </div>
    <p style="margin:14px 0 0;color:#6b7280;font-size:13px;">
      Preview link: <a href="${previewUrl}">${previewUrl}</a>
    </p>
  </div>
</body>
</html>`;
      await sendEmail({
        to: 'admin@zyntel.net',
        subject: `Design review feedback — ${client.name} (${client.clientId})`,
        html,
      });
    } catch (e) {
      console.error('Failed to email admin feedback:', e);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    const msg = String(err?.message ?? 'Unknown error');
    if (msg.toLowerCase().includes('already submitted')) {
      return new Response(JSON.stringify({ error: 'Choice already submitted' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ error: err?.message ?? 'Unknown error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

