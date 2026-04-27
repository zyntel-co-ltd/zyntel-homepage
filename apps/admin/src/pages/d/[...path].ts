import type { APIRoute } from 'astro';
import { lookup as lookupMime } from 'mime-types';
import { getPreviewClientByToken, getActiveMockupPackByToken } from '../../lib/previews.ts';
import { getObjectStream } from '../../lib/r2.ts';

function safePath(input: string): string {
  // Normalize: prevent traversal and leading slashes.
  const clean = input.replace(/\\/g, '/').replace(/^\/+/, '');
  const parts = clean.split('/').filter(Boolean);
  const ok = parts.filter((p) => p !== '.' && p !== '..');
  return ok.join('/');
}

export const GET: APIRoute = async ({ params, url }) => {
  const token = String(url.searchParams.get('token') ?? '').trim();
  if (!token) return new Response('Missing token', { status: 400 });

  const client = await getPreviewClientByToken(token);
  if (!client) return new Response('Not found', { status: 404 });

  // URL shape: /d/{clientId}/{...}
  const raw = Array.isArray((params as any).path) ? (params as any).path.join('/') : String((params as any).path ?? '');
  const path = safePath(raw);
  const [clientId, ...rest] = path.split('/').filter(Boolean);
  if (!clientId || clientId !== client.clientId) return new Response('Not found', { status: 404 });

  const pack = await getActiveMockupPackByToken(token);
  if (!pack) {
    return new Response(`<!doctype html>
<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><meta name="robots" content="noindex,nofollow"/><title>Mockup unavailable</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb;margin:0;padding:24px;">
  <div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;">
    <h1 style="margin:0 0 8px;font-size:18px;color:#111;">This mockup is not available yet</h1>
    <p style="margin:0;color:#374151;line-height:1.6;font-size:14px;">Please request the latest preview link from Zyntel.</p>
  </div>
</body></html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 404 });
  }

  // Special: /d/{clientId}/entry maps to pack.entryPath
  const relative = rest.length === 0 ? 'entry' : rest.join('/');
  const objectPath = relative === 'entry' ? safePath(pack.entryPath) : safePath(relative);

  // Final key: {r2_prefix}/{objectPath}
  const key = `${pack.r2Prefix.replace(/\/+$/, '')}/${objectPath}`;

  try {
    const obj = await getObjectStream(key);
    const body = obj.Body;
    if (!body) return new Response('Not found', { status: 404 });

    // Body in AWS SDK v3 is a stream; Response can accept it directly in Node runtime.
    const contentType =
      (obj.ContentType && String(obj.ContentType)) ||
      (lookupMime(objectPath) ? String(lookupMime(objectPath)) : 'application/octet-stream');

    return new Response(body as any, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
};

