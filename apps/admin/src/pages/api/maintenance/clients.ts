import type { APIRoute } from 'astro';
import { createHash, randomBytes } from 'crypto';
import {
  getAllServiceClients,
  createServiceClient,
  updateServiceClient,
  deleteServiceClient,
} from '../../../lib/maintenance.ts';

export const GET: APIRoute = async () => {
  try {
    const clients = await getAllServiceClients();
    return new Response(JSON.stringify(clients), { headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message ?? 'Server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const rawInv = body.invoiceClientId;
    const invoiceClientId =
      rawInv != null && rawInv !== '' ? Number(rawInv) : null;
    if (!invoiceClientId || isNaN(invoiceClientId)) {
      return new Response(JSON.stringify({ error: 'Select an existing client from Clients directory' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (!body.productName || !body.contactName || !body.contactEmail) {
      return new Response(JSON.stringify({ error: 'productName, contactName, contactEmail required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const client = await createServiceClient({
      name: String(body.name ?? '').trim(),
      productName: String(body.productName).trim(),
      productType: body.productType,
      contactName: String(body.contactName).trim(),
      contactEmail: String(body.contactEmail).trim(),
      invoiceClientId,
      healthCheckUrl: body.healthCheckUrl ?? null,
      apiUrl: body.apiUrl ?? null,
      repoUrl: body.repoUrl ?? null,
      sentryUrl: body.sentryUrl ?? null,
      cronitorUrl: body.cronitorUrl ?? null,
      notes: body.notes ?? null,
    });
    let apiKey: string | undefined;
    if (body.generateApiKey === true) {
      apiKey = randomBytes(32).toString('hex');
      const keyHash = createHash('sha256').update(apiKey).digest('hex');
      await updateServiceClient(client.id, { apiKeyHash: keyHash });
    }
    return new Response(JSON.stringify({ client, ...(apiKey ? { apiKey } : {}) }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message ?? 'Server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const PUT: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { id, ...data } = body;
    if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    const client = await updateServiceClient(id, data);
    return new Response(JSON.stringify(client), { headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    const status = err.message?.includes('not found') ? 404 : 500;
    return new Response(JSON.stringify({ error: err.message ?? 'Server error' }), { status, headers: { 'Content-Type': 'application/json' } });
  }
};

export const DELETE: APIRoute = async ({ url }) => {
  try {
    const id = url.searchParams.get('id');
    if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    await deleteServiceClient(id);
    return new Response(JSON.stringify({ deleted: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message ?? 'Server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
