import type { APIRoute } from 'astro';
import { lookup as lookupMime } from 'mime-types';
import { getPitchSessionByToken } from '../../lib/pitches.ts';
import { getObjectStream } from '../../lib/r2.ts';

function safePath(input: string): string {
  const clean = String(input || '').replace(/\\/g, '/').replace(/^\/+/, '');
  const parts = clean.split('/').filter(Boolean);
  const ok = parts.filter((p) => p !== '.' && p !== '..');
  return ok.join('/');
}

export const GET: APIRoute = async ({ params, url }) => {
  const token = String(url.searchParams.get('token') ?? '').trim();
  if (!token) return new Response('Missing token', { status: 400 });

  const session = await getPitchSessionByToken(token);
  if (!session) return new Response('Not found', { status: 404 });
  if (session.status !== 'active') return new Response('Disabled', { status: 403 });
  if (session.expiryDate && session.expiryDate.getTime() < Date.now()) return new Response('Expired', { status: 410 });
  if (!session.r2Prefix || !session.entryPath) return new Response('No deck uploaded', { status: 404 });

  const raw = Array.isArray((params as any).path) ? (params as any).path.join('/') : String((params as any).path ?? '');
  const path = safePath(raw);
  const relative = path ? path : 'entry';
  const objectPath = relative === 'entry' ? safePath(session.entryPath) : safePath(relative);

  const key = `${String(session.r2Prefix).replace(/\/+$/, '')}/${objectPath}`;
  try {
    const obj = await getObjectStream(key);
    const body = obj.Body;
    if (!body) return new Response('Not found', { status: 404 });
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

