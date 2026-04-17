import type { APIRoute } from 'astro';
import { submitPreviewChoiceByToken } from '../../lib/previews.ts';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const token = String(body?.token ?? '').trim();
    const choiceOption = String(body?.choiceOption ?? '').trim().toUpperCase();
    const choiceComments = String(body?.choiceComments ?? '').trim();

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

    await submitPreviewChoiceByToken({
      token,
      choiceOption: choiceOption as 'A' | 'B' | 'C',
      choiceComments,
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message ?? 'Unknown error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

