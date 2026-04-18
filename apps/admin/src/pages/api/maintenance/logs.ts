import type { APIRoute } from 'astro';
import {
  getMaintenanceLogs,
  createMaintenanceLog,
  deleteMaintenanceLog,
} from '../../../lib/maintenance.ts';

export const GET: APIRoute = async ({ url }) => {
  try {
    const serviceClientId = url.searchParams.get('serviceClientId');
    if (!serviceClientId) {
      return new Response(JSON.stringify({ error: 'serviceClientId required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    const filters = {
      type: url.searchParams.get('type') as any ?? undefined,
      dateFrom: url.searchParams.get('dateFrom') ?? undefined,
      dateTo: url.searchParams.get('dateTo') ?? undefined,
    };
    const logs = await getMaintenanceLogs(serviceClientId, filters);
    return new Response(JSON.stringify(logs), { headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message ?? 'Server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    if (!body.serviceClientId || !body.type || !body.area || !body.summary) {
      return new Response(JSON.stringify({ error: 'serviceClientId, type, area, summary required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    const log = await createMaintenanceLog(body);
    return new Response(JSON.stringify(log), { status: 201, headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message ?? 'Server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const DELETE: APIRoute = async ({ url }) => {
  try {
    const id = url.searchParams.get('id');
    if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    await deleteMaintenanceLog(id);
    return new Response(JSON.stringify({ deleted: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message ?? 'Server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
