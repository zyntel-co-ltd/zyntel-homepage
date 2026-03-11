/**
 * Audit service - login and operational action logging; query for review.
 */
import { query } from '../config/database';

const getClientIp = (req: any): string | null => {
  return req?.ip
    || req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim()
    || req?.connection?.remoteAddress
    || null;
};

export const logLogin = async (params: {
  username: string;
  userId?: number;
  success: boolean;
  req?: any;
}) => {
  const ip = params.req ? getClientIp(params.req) : null;
  const userAgent = params.req?.headers?.['user-agent'] || null;
  await query(
    `INSERT INTO login_audit (username, user_id, success, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5)`,
    [params.username, params.userId ?? null, params.success, ip, userAgent]
  );
};

export const logAudit = async (params: {
  userId: number;
  action: string;
  tableName?: string;
  recordId?: number;
  oldValues?: object;
  newValues?: object;
  req?: any;
}) => {
  const ip = params.req ? getClientIp(params.req) : null;
  await query(
    `INSERT INTO audit_log (user_id, action, table_name, record_id, old_values, new_values, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      params.userId,
      params.action,
      params.tableName ?? null,
      params.recordId ?? null,
      params.oldValues ? JSON.stringify(params.oldValues) : null,
      params.newValues ? JSON.stringify(params.newValues) : null,
      ip,
    ]
  );
};

export interface AuditLogEntry {
  id: number;
  user_id: number | null;
  username?: string;
  action: string;
  table_name: string | null;
  record_id: number | null;
  old_values: object | null;
  new_values: object | null;
  ip_address: string | null;
  created_at: string;
}

export interface LoginAuditEntry {
  id: number;
  username: string;
  user_id: number | null;
  success: boolean;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export const getAuditLogs = async (params: {
  action?: string;
  userId?: number;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}): Promise<{ rows: AuditLogEntry[]; total: number }> => {
  const conditions: string[] = ['1=1'];
  const values: any[] = [];
  let paramCount = 1;

  if (params.action) {
    conditions.push(`a.action = $${paramCount++}`);
    values.push(params.action);
  }
  if (params.userId) {
    conditions.push(`a.user_id = $${paramCount++}`);
    values.push(params.userId);
  }
  if (params.startDate) {
    conditions.push(`a.created_at >= $${paramCount++}::timestamp`);
    values.push(params.startDate);
  }
  if (params.endDate) {
    conditions.push(`a.created_at <= $${paramCount++}::timestamp`);
    values.push(params.endDate + ' 23:59:59');
  }

  const whereClause = conditions.join(' AND ');
  const limit = Math.min(params.limit ?? 100, 500);
  const offset = params.offset ?? 0;

  const countResult = await query(
    `SELECT COUNT(*) as total FROM audit_log a WHERE ${whereClause}`,
    values
  );
  const total = parseInt(countResult.rows[0]?.total || '0');

  const result = await query(
    `SELECT a.id, a.user_id, u.username, a.action, a.table_name, a.record_id,
            a.old_values, a.new_values, a.ip_address, a.created_at
     FROM audit_log a
     LEFT JOIN users u ON u.id = a.user_id
     WHERE ${whereClause}
     ORDER BY a.created_at DESC
     LIMIT $${paramCount++} OFFSET $${paramCount}`,
    [...values, limit, offset]
  );

  const rows = result.rows.map((r: any) => ({
    id: r.id,
    user_id: r.user_id,
    username: r.username,
    action: r.action,
    table_name: r.table_name,
    record_id: r.record_id,
    old_values: r.old_values,
    new_values: r.new_values,
    ip_address: r.ip_address,
    created_at: r.created_at,
  }));

  return { rows, total };
};

export const getLoginAudit = async (params: {
  username?: string;
  success?: boolean;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}): Promise<{ rows: LoginAuditEntry[]; total: number }> => {
  const conditions: string[] = ['1=1'];
  const values: any[] = [];
  let paramCount = 1;

  if (params.username) {
    conditions.push(`username ILIKE $${paramCount++}`);
    values.push(`%${params.username}%`);
  }
  if (params.success !== undefined) {
    conditions.push(`success = $${paramCount++}`);
    values.push(params.success);
  }
  if (params.startDate) {
    conditions.push(`created_at >= $${paramCount++}::timestamp`);
    values.push(params.startDate);
  }
  if (params.endDate) {
    conditions.push(`created_at <= $${paramCount++}::timestamp`);
    values.push(params.endDate + ' 23:59:59');
  }

  const whereClause = conditions.join(' AND ');
  const limit = Math.min(params.limit ?? 100, 500);
  const offset = params.offset ?? 0;

  const countResult = await query(
    `SELECT COUNT(*) as total FROM login_audit WHERE ${whereClause}`,
    values
  );
  const total = parseInt(countResult.rows[0]?.total || '0');

  const result = await query(
    `SELECT id, username, user_id, success, ip_address, user_agent, created_at
     FROM login_audit
     WHERE ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${paramCount++} OFFSET $${paramCount}`,
    [...values, limit, offset]
  );

  return { rows: result.rows, total };
};
