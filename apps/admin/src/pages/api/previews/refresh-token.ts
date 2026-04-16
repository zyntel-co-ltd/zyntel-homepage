import type { APIRoute } from 'astro';
import { refreshPreviewToken } from '../../../lib/previews.ts';

export const POST: APIRoute = async ({ request }) => {
  const { clientId } = await request.json();
  if (!clientId) return new Response(JSON.stringify({ error: 'clientId required' }), { status: 400 });
  const client = await refreshPreviewToken(clientId);
  const SITE = import.meta.env.SITE_URL ?? 'https://admin.zyntel.net';
  return new Response(JSON.stringify({
    token: client.token,
    previewLink: `${SITE}/p/${client.token}`
  }), { headers: { 'Content-Type': 'application/json' } });
};
