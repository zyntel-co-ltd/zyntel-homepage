import type { APIRoute } from 'astro';
import { logPreviewEventByToken, patchPreviewDecisionByToken } from '../../lib/previews.ts';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const token = String(body?.token ?? '').trim();
    const eventType = String(body?.eventType ?? '').trim();
    const page = body?.page != null ? String(body.page).trim() : null;
    const sessionId = body?.sessionId != null ? String(body.sessionId).trim() : null;
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

    // Persist decision-guide answers even if the client never submits final feedback.
    if (eventType === 'decision_guide_update') {
      const q1 = (meta as any)?.q1 != null ? String((meta as any).q1).trim() : null;
      const q2 = (meta as any)?.q2 != null ? String((meta as any).q2).trim() : null;
      const q3 = (meta as any)?.q3 != null ? String((meta as any).q3).trim() : null;
      const recommended = (meta as any)?.recommended != null ? String((meta as any).recommended).trim().toUpperCase() : null;
      // Best-effort: do not fail tracking if the DB update fails.
      patchPreviewDecisionByToken({
        token,
        decisionAnswers: { q1, q2, q3, recommended },
        sessionId,
      }).catch((e) => console.error('Failed to persist decision answers:', e));
    }

    await logPreviewEventByToken({
      token,
      eventType,
      page,
      userAgent: request.headers.get('user-agent'),
      durationSeconds: Number.isFinite(durationSeconds) ? durationSeconds : null,
      sessionId,
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

