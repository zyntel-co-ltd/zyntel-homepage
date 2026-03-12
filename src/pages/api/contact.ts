import type { APIRoute } from 'astro';
import { insertContactSubmission } from '../../lib/db';

export const POST: APIRoute = async ({ request }) => {
  if (request.headers.get('content-type') !== 'application/json') {
    return new Response(JSON.stringify({ error: 'Expect JSON' }), { status: 400 });
  }
  try {
    const body = await request.json();
    const email = String(body?.email ?? '').trim();
    const name = String(body?.name ?? '').trim();
    const message = String(body?.message ?? '').trim();
    if (!email) {
      return new Response(JSON.stringify({ error: 'Email required' }), { status: 400 });
    }
    await insertContactSubmission(email, name || undefined, message || undefined);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Contact API error:', e);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
};
