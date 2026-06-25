import { sql } from '@zyntel/db';
import type { AppEvent, AppEventLevel, AppEventType } from '@zyntel/db/schema';

export type { AppEvent, AppEventLevel, AppEventType };

function rowToAppEvent(row: Record<string, any>): AppEvent {
  return {
    id: String(row.id),
    serviceClientId: String(row.service_client_id),
    app: String(row.app),
    environment: String(row.environment ?? 'production'),
    eventType: String(row.event_type) as AppEventType,
    level: String(row.level ?? 'info') as AppEventLevel,
    message: String(row.message),
    data: row.data ?? null,
    source: row.source != null ? String(row.source) : null,
    actor: row.actor != null ? String(row.actor) : null,
    r2Key: row.r2_key != null ? String(row.r2_key) : null,
    occurredAt: new Date(row.occurred_at),
    createdAt: new Date(row.created_at),
  };
}

const ALLOWED_LEVELS: AppEventLevel[] = ['debug', 'info', 'warn', 'error', 'critical'];

export async function insertAppEvent(event: {
  serviceClientId: string;
  app: string;
  environment?: string;
  eventType: AppEventType | string;
  level?: AppEventLevel;
  message: string;
  data?: Record<string, any> | null;
  source?: string | null;
  actor?: string | null;
  occurredAt?: Date | null;
}): Promise<AppEvent> {
  const level = ALLOWED_LEVELS.includes(event.level as AppEventLevel) ? event.level! : 'info';
  const dataJson = event.data ? JSON.stringify(event.data) : null;
  const occurredAt = (event.occurredAt instanceof Date && !isNaN(event.occurredAt.getTime()))
    ? event.occurredAt.toISOString()
    : new Date().toISOString();

  const rows = await sql`
    INSERT INTO app_events (
      service_client_id, app, environment, event_type, level,
      message, data, source, actor, occurred_at
    ) VALUES (
      ${event.serviceClientId},
      ${event.app},
      ${event.environment ?? 'production'},
      ${event.eventType},
      ${level},
      ${event.message},
      ${dataJson},
      ${event.source ?? null},
      ${event.actor ?? null},
      ${occurredAt}
    )
    RETURNING *
  `;
  return rowToAppEvent(rows[0] as Record<string, any>);
}

export async function getAppEvents(opts: {
  serviceClientId?: string;
  app?: string;
  eventType?: string;
  level?: string;
  from?: string;
  to?: string;
  limit?: number;
  onlyUnarchived?: boolean;
}): Promise<AppEvent[]> {
  const limit = Math.min(500, Math.max(1, opts.limit ?? 100));
  const conditions: string[] = [];
  const values: any[] = [];

  if (opts.serviceClientId) {
    values.push(opts.serviceClientId);
    conditions.push(`service_client_id = $${values.length}`);
  }
  if (opts.app) {
    values.push(opts.app);
    conditions.push(`app = $${values.length}`);
  }
  if (opts.eventType) {
    values.push(opts.eventType);
    conditions.push(`event_type = $${values.length}`);
  }
  if (opts.level) {
    values.push(opts.level);
    conditions.push(`level = $${values.length}`);
  }
  if (opts.from) {
    values.push(opts.from);
    conditions.push(`occurred_at >= $${values.length}::date`);
  }
  if (opts.to) {
    values.push(opts.to);
    conditions.push(`occurred_at < ($${values.length}::date + interval '1 day')`);
  }
  if (opts.onlyUnarchived) {
    conditions.push(`r2_key IS NULL`);
  }

  values.push(limit);
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const query = `SELECT * FROM app_events ${where} ORDER BY occurred_at DESC LIMIT $${values.length}`;
  const rows = await sql(query, values);
  return (rows as Record<string, any>[]).map(rowToAppEvent);
}

export async function getEventsForArchival(olderThanDays = 90): Promise<AppEvent[]> {
  const rows = await sql(
    `SELECT * FROM app_events
     WHERE occurred_at < now() - INTERVAL '1 day' * $1
       AND r2_key IS NULL
     ORDER BY occurred_at ASC
     LIMIT 5000`,
    [olderThanDays]
  );
  return (rows as Record<string, any>[]).map(rowToAppEvent);
}

export async function markEventsArchived(ids: string[], r2Key: string): Promise<void> {
  if (ids.length === 0) return;
  const placeholders = ids.map((_, i) => `$${i + 2}`).join(', ');
  await sql(`UPDATE app_events SET r2_key = $1 WHERE id IN (${placeholders})`, [r2Key, ...ids]);
}

export async function deleteArchivedEvents(olderThanDays = 90): Promise<number> {
  const rows = await sql(
    `DELETE FROM app_events
     WHERE occurred_at < now() - INTERVAL '1 day' * $1
       AND r2_key IS NOT NULL
     RETURNING id`,
    [olderThanDays]
  );
  return rows.length;
}

export async function countRecentErrors(serviceClientId: string, withinHours = 24): Promise<number> {
  const rows = await sql(
    `SELECT COUNT(*)::int AS cnt FROM app_events
     WHERE service_client_id = $1
       AND level IN ('error','critical')
       AND occurred_at >= now() - INTERVAL '1 hour' * $2`,
    [serviceClientId, withinHours]
  );
  return Number((rows[0] as any)?.cnt ?? 0);
}
