import type { APIRoute } from 'astro';
import { sql } from '@zyntel/db';
import { updateWorkOrder } from '../../lib/maintenance.ts';
import type { WorkOrderCoverage } from '@zyntel/db/schema';

const COVERAGE: WorkOrderCoverage[] = ['contract_included', 'paid_extra', 'goodwill_free'];

export const GET: APIRoute = async ({ url }) => {
  try {
    if (!import.meta.env.DATABASE_URL) {
      return new Response(JSON.stringify([]), { headers: { 'Content-Type': 'application/json' } });
    }
    const status = url.searchParams.get('status');
    const rows = status
      ? await sql`
          SELECT wo.*, sc.name AS client_name, sc.product_name AS client_product_name
          FROM work_orders wo
          JOIN service_clients sc ON sc.id = wo.service_client_id
          WHERE wo.status = ${status}
          ORDER BY wo.created_at DESC
        `
      : await sql`
          SELECT wo.*, sc.name AS client_name, sc.product_name AS client_product_name
          FROM work_orders wo
          JOIN service_clients sc ON sc.id = wo.service_client_id
          ORDER BY wo.created_at DESC
        `;
    const wos = (rows as Record<string, any>[]).map((row) => ({
      id: String(row.id),
      serviceClientId: String(row.service_client_id),
      clientName: String(row.client_name),
      productName: String(row.client_product_name),
      woNumber: String(row.wo_number),
      title: String(row.title),
      description: String(row.description ?? ''),
      scopeItems: (row.scope_items ?? []) as string[],
      estimatedCost: row.estimated_cost != null ? Number(row.estimated_cost) : null,
      currency: String(row.currency ?? 'UGX'),
      coverage: String(row.coverage ?? 'contract_included'),
      status: String(row.status),
      approvalStatus: String(row.approval_status ?? 'draft'),
      notes: row.notes != null ? String(row.notes) : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
    return new Response(JSON.stringify(wos), { headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message ?? 'Server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const PUT: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { id, ...data } = body;
    if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    if (data.coverage != null && !COVERAGE.includes(data.coverage)) {
      return new Response(JSON.stringify({ error: 'Invalid coverage' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
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
