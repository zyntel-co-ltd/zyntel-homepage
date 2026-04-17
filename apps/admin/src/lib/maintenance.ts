import { sql } from '@zyntel/db';
import type {
  ServiceClient,
  MaintenanceLog,
  WorkOrder,
  ProductType,
  MaintenanceLogType,
  WorkOrderStatus,
} from '@zyntel/db/schema';

// --- Row mappers ---

function rowToServiceClient(row: Record<string, any>): ServiceClient {
  return {
    id: String(row.id),
    name: String(row.name),
    productName: String(row.product_name),
    productType: String(row.product_type) as ProductType,
    contactName: String(row.contact_name),
    contactEmail: String(row.contact_email),
    healthCheckUrl: row.health_check_url != null ? String(row.health_check_url) : null,
    apiUrl: row.api_url != null ? String(row.api_url) : null,
    apiKeyHash: row.api_key_hash != null ? String(row.api_key_hash) : null,
    notes: row.notes != null ? String(row.notes) : null,
    createdAt: new Date(row.created_at),
  };
}

function rowToMaintenanceLog(row: Record<string, any>): MaintenanceLog {
  return {
    id: String(row.id),
    serviceClientId: String(row.service_client_id),
    logDate: String(row.log_date).slice(0, 10),
    type: String(row.type) as MaintenanceLogType,
    area: String(row.area),
    summary: String(row.summary),
    actionTaken: String(row.action_taken),
    outcome: String(row.outcome),
    workOrderId: row.work_order_id != null ? String(row.work_order_id) : null,
    loggedBy: String(row.logged_by),
    createdAt: new Date(row.created_at),
  };
}

function rowToWorkOrder(row: Record<string, any>): WorkOrder {
  return {
    id: String(row.id),
    serviceClientId: String(row.service_client_id),
    woNumber: String(row.wo_number),
    title: String(row.title),
    description: String(row.description),
    scopeItems: (row.scope_items ?? []) as string[],
    estimatedCost: row.estimated_cost != null ? Number(row.estimated_cost) : null,
    currency: String(row.currency),
    status: String(row.status) as WorkOrderStatus,
    approvedBy: row.approved_by != null ? String(row.approved_by) : null,
    approvedAt: row.approved_at ? new Date(row.approved_at) : null,
    completedAt: row.completed_at ? new Date(row.completed_at) : null,
    notes: row.notes != null ? String(row.notes) : null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

async function nextWoNumber(): Promise<string> {
  const rows = await sql`
    SELECT 'WO-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('wo_number_seq')::text, 3, '0') AS wo_number
  `;
  return String((rows[0] as any).wo_number);
}

// --- Service Clients ---

export async function getAllServiceClients(): Promise<ServiceClient[]> {
  if (!import.meta.env.DATABASE_URL) return [];
  const rows = await sql`SELECT * FROM service_clients ORDER BY name ASC`;
  return (rows as Record<string, any>[]).map(rowToServiceClient);
}

export async function getServiceClientById(id: string): Promise<ServiceClient | null> {
  if (!import.meta.env.DATABASE_URL) return null;
  const rows = await sql`SELECT * FROM service_clients WHERE id = ${id}`;
  const row = rows[0] as Record<string, any> | undefined;
  return row ? rowToServiceClient(row) : null;
}

export async function createServiceClient(data: {
  name: string;
  productName: string;
  productType?: ProductType;
  contactName: string;
  contactEmail: string;
  healthCheckUrl?: string | null;
  apiUrl?: string | null;
  notes?: string | null;
}): Promise<ServiceClient> {
  if (!import.meta.env.DATABASE_URL) throw new Error('DATABASE_URL must be set');
  const rows = await sql`
    INSERT INTO service_clients (name, product_name, product_type, contact_name, contact_email, health_check_url, api_url, notes)
    VALUES (
      ${data.name},
      ${data.productName},
      ${data.productType ?? 'other'},
      ${data.contactName},
      ${data.contactEmail},
      ${data.healthCheckUrl ?? null},
      ${data.apiUrl ?? null},
      ${data.notes ?? null}
    )
    RETURNING *
  `;
  return rowToServiceClient(rows[0] as Record<string, any>);
}

export async function updateServiceClient(
  id: string,
  data: Partial<{
    name: string;
    productName: string;
    productType: ProductType;
    contactName: string;
    contactEmail: string;
    healthCheckUrl: string | null;
    apiUrl: string | null;
    apiKeyHash: string | null;
    notes: string | null;
  }>
): Promise<ServiceClient> {
  if (!import.meta.env.DATABASE_URL) throw new Error('DATABASE_URL must be set');
  const updates: string[] = [];
  const values: any[] = [];

  const map: Record<string, string> = {
    name: 'name',
    productName: 'product_name',
    productType: 'product_type',
    contactName: 'contact_name',
    contactEmail: 'contact_email',
    healthCheckUrl: 'health_check_url',
    apiUrl: 'api_url',
    apiKeyHash: 'api_key_hash',
    notes: 'notes',
  };
  for (const [key, col] of Object.entries(map)) {
    if ((data as any)[key] !== undefined) {
      updates.push(`${col} = $${values.length + 1}`);
      values.push((data as any)[key]);
    }
  }
  if (!updates.length) {
    const existing = await getServiceClientById(id);
    if (!existing) throw new Error('Service client not found');
    return existing;
  }
  values.push(id);
  const query = `UPDATE service_clients SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING *`;
  const rows = await sql(query, values);
  const row = rows[0] as Record<string, any> | undefined;
  if (!row) throw new Error('Service client not found');
  return rowToServiceClient(row);
}

export async function deleteServiceClient(id: string): Promise<void> {
  if (!import.meta.env.DATABASE_URL) throw new Error('DATABASE_URL must be set');
  await sql`DELETE FROM service_clients WHERE id = ${id}`;
}

// --- Maintenance Logs ---

export async function getMaintenanceLogs(
  serviceClientId: string,
  filters?: { type?: MaintenanceLogType; dateFrom?: string; dateTo?: string }
): Promise<MaintenanceLog[]> {
  if (!import.meta.env.DATABASE_URL) return [];
  const conditions: string[] = ['service_client_id = $1'];
  const values: any[] = [serviceClientId];

  if (filters?.type) {
    values.push(filters.type);
    conditions.push(`type = $${values.length}`);
  }
  if (filters?.dateFrom) {
    values.push(filters.dateFrom);
    conditions.push(`log_date >= $${values.length}`);
  }
  if (filters?.dateTo) {
    values.push(filters.dateTo);
    conditions.push(`log_date <= $${values.length}`);
  }

  const query = `SELECT * FROM maintenance_logs WHERE ${conditions.join(' AND ')} ORDER BY log_date DESC, created_at DESC`;
  const rows = await sql(query, values);
  return (rows as Record<string, any>[]).map(rowToMaintenanceLog);
}

export async function createMaintenanceLog(data: {
  serviceClientId: string;
  logDate?: string;
  type: MaintenanceLogType;
  area: string;
  summary: string;
  actionTaken?: string;
  outcome?: string;
  workOrderId?: string | null;
  loggedBy?: string;
}): Promise<MaintenanceLog> {
  if (!import.meta.env.DATABASE_URL) throw new Error('DATABASE_URL must be set');
  const rows = await sql`
    INSERT INTO maintenance_logs (service_client_id, log_date, type, area, summary, action_taken, outcome, work_order_id, logged_by)
    VALUES (
      ${data.serviceClientId},
      ${data.logDate ?? new Date().toISOString().slice(0, 10)},
      ${data.type},
      ${data.area},
      ${data.summary},
      ${data.actionTaken ?? ''},
      ${data.outcome ?? ''},
      ${data.workOrderId ?? null},
      ${data.loggedBy ?? 'Wycliff'}
    )
    RETURNING *
  `;
  return rowToMaintenanceLog(rows[0] as Record<string, any>);
}

export async function deleteMaintenanceLog(id: string): Promise<void> {
  if (!import.meta.env.DATABASE_URL) throw new Error('DATABASE_URL must be set');
  await sql`DELETE FROM maintenance_logs WHERE id = ${id}`;
}

// --- Work Orders ---

export async function getWorkOrders(serviceClientId: string): Promise<WorkOrder[]> {
  if (!import.meta.env.DATABASE_URL) return [];
  const rows = await sql`
    SELECT * FROM work_orders WHERE service_client_id = ${serviceClientId} ORDER BY created_at DESC
  `;
  return (rows as Record<string, any>[]).map(rowToWorkOrder);
}

export async function createWorkOrder(data: {
  serviceClientId: string;
  title: string;
  description?: string;
  scopeItems?: string[];
  estimatedCost?: number | null;
  currency?: string;
  notes?: string | null;
}): Promise<WorkOrder> {
  if (!import.meta.env.DATABASE_URL) throw new Error('DATABASE_URL must be set');
  const woNumber = await nextWoNumber();
  const rows = await sql`
    INSERT INTO work_orders (service_client_id, wo_number, title, description, scope_items, estimated_cost, currency, notes)
    VALUES (
      ${data.serviceClientId},
      ${woNumber},
      ${data.title},
      ${data.description ?? ''},
      ${JSON.stringify(data.scopeItems ?? [])},
      ${data.estimatedCost ?? null},
      ${data.currency ?? 'UGX'},
      ${data.notes ?? null}
    )
    RETURNING *
  `;
  return rowToWorkOrder(rows[0] as Record<string, any>);
}

export async function updateWorkOrder(
  id: string,
  data: Partial<{
    title: string;
    description: string;
    scopeItems: string[];
    estimatedCost: number | null;
    currency: string;
    status: WorkOrderStatus;
    approvedBy: string | null;
    approvedAt: Date | null;
    completedAt: Date | null;
    notes: string | null;
  }>
): Promise<WorkOrder> {
  if (!import.meta.env.DATABASE_URL) throw new Error('DATABASE_URL must be set');
  const updates: string[] = [];
  const values: any[] = [];

  if (data.title !== undefined) { updates.push(`title = $${values.length + 1}`); values.push(data.title); }
  if (data.description !== undefined) { updates.push(`description = $${values.length + 1}`); values.push(data.description); }
  if (data.scopeItems !== undefined) { updates.push(`scope_items = $${values.length + 1}`); values.push(JSON.stringify(data.scopeItems)); }
  if (data.estimatedCost !== undefined) { updates.push(`estimated_cost = $${values.length + 1}`); values.push(data.estimatedCost); }
  if (data.currency !== undefined) { updates.push(`currency = $${values.length + 1}`); values.push(data.currency); }
  if (data.status !== undefined) { updates.push(`status = $${values.length + 1}`); values.push(data.status); }
  if (data.approvedBy !== undefined) { updates.push(`approved_by = $${values.length + 1}`); values.push(data.approvedBy); }
  if (data.approvedAt !== undefined) { updates.push(`approved_at = $${values.length + 1}`); values.push(data.approvedAt); }
  if (data.completedAt !== undefined) { updates.push(`completed_at = $${values.length + 1}`); values.push(data.completedAt); }
  if (data.notes !== undefined) { updates.push(`notes = $${values.length + 1}`); values.push(data.notes); }

  if (!updates.length) {
    const rows = await sql`SELECT * FROM work_orders WHERE id = ${id}`;
    const row = rows[0] as Record<string, any> | undefined;
    if (!row) throw new Error('Work order not found');
    return rowToWorkOrder(row);
  }

  values.push(id);
  const query = `
    UPDATE work_orders SET ${updates.join(', ')}, updated_at = now()
    WHERE id = $${values.length}
    RETURNING *
  `;
  const rows = await sql(query, values);
  const row = rows[0] as Record<string, any> | undefined;
  if (!row) throw new Error('Work order not found');
  return rowToWorkOrder(row);
}

// --- Summary ---

export async function getMaintenanceSummary(
  serviceClientId: string,
  quarterStart: Date,
  quarterEnd: Date
): Promise<{
  totalLogs: number;
  incidents: number;
  preventive: number;
  support: number;
  resolvedIncidents: WorkOrder[];
  openWorkOrders: WorkOrder[];
}> {
  if (!import.meta.env.DATABASE_URL) {
    return { totalLogs: 0, incidents: 0, preventive: 0, support: 0, resolvedIncidents: [], openWorkOrders: [] };
  }
  const from = quarterStart.toISOString().slice(0, 10);
  const to = quarterEnd.toISOString().slice(0, 10);

  const logRows = await sql`
    SELECT type, count(*) AS cnt
    FROM maintenance_logs
    WHERE service_client_id = ${serviceClientId}
      AND log_date BETWEEN ${from} AND ${to}
    GROUP BY type
  `;

  const counts: Record<string, number> = {};
  let total = 0;
  for (const r of logRows as Array<{ type: string; cnt: string }>) {
    counts[r.type] = Number(r.cnt);
    total += Number(r.cnt);
  }

  const allWOs = await getWorkOrders(serviceClientId);
  const resolvedIncidents = allWOs.filter((wo) => wo.status === 'completed' || wo.status === 'invoiced');
  const openWorkOrders = allWOs.filter((wo) => !['completed', 'invoiced'].includes(wo.status));

  return {
    totalLogs: total,
    incidents: counts['incident'] ?? 0,
    preventive: counts['preventive'] ?? 0,
    support: counts['support'] ?? 0,
    resolvedIncidents,
    openWorkOrders,
  };
}
