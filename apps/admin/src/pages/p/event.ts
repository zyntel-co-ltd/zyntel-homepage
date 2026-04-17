import type { APIRoute } from 'astro';
import { logPreviewEventByToken } from '../../lib/previews.ts';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const token = String(body?.token ?? '').trim();
    const eventType = String(body?.eventType ?? '').trim();
    const page = body?.page != null ? String(body.page).trim() : null;
    const durationSecondsRaw = body?.durationSeconds;
    const durationSeconds =
      durationSecondsRaw === undefined || durationSecondsRaw === null
        ? null
        : Number(durationSecondsRaw);
    const meta = body?.meta && typeof body.meta === 'object' ? (body.meta as Record<string, unknown>) : null;

    if (!token) {
      return new Response(JSON.stringify({ error: 'token required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    if (!eventType) {
      return new Response(JSON.stringify({ error: 'eventType required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    await logPreviewEventByToken({
      token,
      eventType,
      page,
      userAgent: request.headers.get('user-agent'),
      durationSeconds: Number.isFinite(durationSeconds) ? durationSeconds : null,
      meta,
    });

    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message ?? 'Unknown error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

