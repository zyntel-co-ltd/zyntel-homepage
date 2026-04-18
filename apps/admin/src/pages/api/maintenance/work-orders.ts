import type { APIRoute } from 'astro';
import {
  getWorkOrders,
  createWorkOrder,
  updateWorkOrder,
} from '../../../lib/maintenance.ts';
import type { WorkOrderCoverage } from '@zyntel/db/schema';

const COVERAGE: WorkOrderCoverage[] = ['contract_included', 'paid_extra', 'goodwill_free'];
import { sql } from '@zyntel/db';

export const GET: APIRoute = async ({ url }) => {
  try {
    const serviceClientId = url.searchParams.get('serviceClientId');
    if (!serviceClientId) {
      return new Response(JSON.stringify({ error: 'serviceClientId required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    const wos = await getWorkOrders(serviceClientId);
    return new Response(JSON.stringify(wos), { headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message ?? 'Server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    if (!body.serviceClientId || !body.title) {
      return new Response(JSON.stringify({ error: 'serviceClientId and title required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    if (body.coverage != null && !COVERAGE.includes(body.coverage)) {
      return new Response(JSON.stringify({ error: 'Invalid coverage' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    const wo = await createWorkOrder(body);
    return new Response(JSON.stringify(wo), { status: 201, headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message ?? 'Server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const PUT: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { id, ...data } = body;
    if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    if (data.approvedAt) data.approvedAt = new Date(data.approvedAt);
    if (data.completedAt) data.completedAt = new Date(data.completedAt);
    const wo = await updateWorkOrder(id, data);
    return new Response(JSON.stringify(wo), { headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    const status = err.message?.includes('not found') ? 404 : 500;
    return new Response(JSON.stringify({ error: err.message ?? 'Server error' }), { status, headers: { 'Content-Type': 'application/json' } });
  }
};

export const DELETE: APIRoute = async ({ url }) => {
  try {
    const id = url.searchParams.get('id');
    if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    if (!import.meta.env.DATABASE_URL) throw new Error('DATABASE_URL must be set');
    await sql`DELETE FROM work_orders WHERE id = ${id}`;
    return new Response(JSON.stringify({ deleted: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message ?? 'Server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
