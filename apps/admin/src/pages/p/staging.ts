import type { APIRoute } from 'astro';
import { getPreviewClientByToken, logPreviewEventByToken } from '../../lib/previews.ts';

export const GET: APIRoute = async ({ url, request }) => {
  const token = String(url.searchParams.get('token') ?? '').trim();
  if (!token) return new Response('Missing token', { status: 400 });

  const client = await getPreviewClientByToken(token);
  if (!client) return new Response('Not found', { status: 404 });

  // Best-effort tracking
  logPreviewEventByToken({
    token,
    eventType: 'staging_link_open',
    page: url.pathname + url.search,
    userAgent: request.headers.get('user-agent'),
    sessionId: url.searchParams.get('sid'),
  }).catch(() => {});

  const enabled = Boolean(client.stagingEnabled);
  const target = (client.stagingUrl ?? '').trim();

  if (!enabled || !target) {
    return new Response(`<!doctype html>
<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><meta name="robots" content="noindex,nofollow"/><title>Staging link disabled</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb;margin:0;padding:24px;">
  <div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;">
    <h1 style="margin:0 0 8px;font-size:18px;color:#111;">This staging link is currently disabled</h1>
    <p style="margin:0;color:#374151;line-height:1.6;font-size:14px;">Please request the latest review link from Zyntel.</p>
  </div>
</body></html>`, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      status: 410,
    });
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: target,
      'Cache-Control': 'no-store',
    },
  });
};

