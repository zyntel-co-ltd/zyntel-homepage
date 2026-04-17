import type { APIRoute } from 'astro';
import { logPitchView } from '../../../lib/pitches.ts';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const sessionId = String(body?.sessionId ?? '').trim();
    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'sessionId required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const durationSecondsRaw = body?.durationSeconds;
    const durationSeconds =
      durationSecondsRaw === undefined || durationSecondsRaw === null
        ? null
        : Number(durationSecondsRaw);

    const ua = request.headers.get('user-agent');
    const view = await logPitchView(sessionId, ua, Number.isFinite(durationSeconds) ? durationSeconds : null);
    return new Response(JSON.stringify({ logged: true, viewId: view.id }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message ?? 'Unknown error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

