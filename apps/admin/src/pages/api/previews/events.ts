import type { APIRoute } from 'astro';
import { getPreviewEventHistory } from '../../../lib/previews.ts';

export const GET: APIRoute = async ({ url }) => {
  try {
    const clientId = url.searchParams.get('clientId');
    if (!clientId) {
      return new Response(JSON.stringify({ error: 'clientId required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const events = await getPreviewEventHistory(clientId);
    return new Response(JSON.stringify(events), { headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message ?? 'Unknown error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

