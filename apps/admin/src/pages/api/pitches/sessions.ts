import type { APIRoute } from 'astro';
import {
  createPitchSession,
  deletePitchSession,
  getAllPitchSessions,
  updatePitchSession,
} from '../../../lib/pitches.ts';

export const GET: APIRoute = async () => {
  try {
    const sessions = await getAllPitchSessions();
    return new Response(JSON.stringify(sessions), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message ?? 'Unknown error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();

    const expiryDaysRaw = body?.expiryDays;
    const expiryDays =
      expiryDaysRaw === undefined || expiryDaysRaw === null ? null : Number(expiryDaysRaw);

    const neverExpires = Boolean(body?.neverExpires);
    const expiryDate = neverExpires
      ? null
      : Number.isFinite(expiryDays) && (expiryDays as number) > 0
        ? new Date(Date.now() + (expiryDays as number) * 24 * 60 * 60 * 1000)
        : body?.expiryDate
          ? new Date(body.expiryDate)
          : null;

    const session = await createPitchSession({
      label: body.label,
      audienceName: body.audienceName,
      eventContext: body.eventContext,
      deckFolder: body.deckFolder,
      deckFile: body.deckFile,
      status: body.status,
      expiryDate,
    });

    return new Response(JSON.stringify(session), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message ?? 'Unknown error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const PUT: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const id = String(body?.id ?? '').trim();
    if (!id) {
      return new Response(JSON.stringify({ error: 'id required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const expiryDate =
      body.expiryDate === undefined
        ? undefined
        : body.expiryDate === null
          ? null
          : new Date(body.expiryDate);

    const session = await updatePitchSession(id, {
      label: body.label,
      audienceName: body.audienceName,
      eventContext: body.eventContext,
      deckFolder: body.deckFolder,
      deckFile: body.deckFile,
      status: body.status,
      expiryDate,
    });

    return new Response(JSON.stringify(session), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message ?? 'Unknown error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const DELETE: APIRoute = async ({ url }) => {
  try {
    const id = url.searchParams.get('id');
    if (!id) {
      return new Response(JSON.stringify({ error: 'id required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    await deletePitchSession(id);
    return new Response(JSON.stringify({ deleted: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message ?? 'Unknown error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

