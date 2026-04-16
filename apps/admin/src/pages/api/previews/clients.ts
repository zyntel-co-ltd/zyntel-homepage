import type { APIRoute } from 'astro';
import {
  getAllPreviewClients,
  createPreviewClient,
  updatePreviewClient,
  deletePreviewClient,
} from '../../../lib/previews.ts';

export const GET: APIRoute = async () => {
  const clients = await getAllPreviewClients();
  return new Response(JSON.stringify(clients), {
    headers: { 'Content-Type': 'application/json' }
  });
};

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const client = await createPreviewClient(body);
  return new Response(JSON.stringify(client), {
    status: 201,
    headers: { 'Content-Type': 'application/json' }
  });
};

export const PUT: APIRoute = async ({ request }) => {
  const body = await request.json();
  const { clientId, ...data } = body;
  if (!clientId) return new Response(JSON.stringify({ error: 'clientId required' }), { status: 400 });
  if (data.expiryDate) data.expiryDate = new Date(data.expiryDate);
  const client = await updatePreviewClient(clientId, data);
  return new Response(JSON.stringify(client), { headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ url }) => {
  const clientId = url.searchParams.get('clientId');
  if (!clientId) return new Response(JSON.stringify({ error: 'clientId required' }), { status: 400 });
  await deletePreviewClient(clientId);
  return new Response(JSON.stringify({ deleted: true }), { headers: { 'Content-Type': 'application/json' } });
};
