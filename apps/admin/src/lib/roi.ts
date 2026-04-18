import { sql } from '@zyntel/db';
import type { ROISnapshot, ROISource } from '@zyntel/db/schema';

function rowToSnapshot(row: Record<string, any>): ROISnapshot {
  return {
    id: String(row.id),
    serviceClientId: String(row.service_client_id),
    snapshotDate: String(row.snapshot_date).slice(0, 10),
    metricKey: String(row.metric_key),
    metricValue: Number(row.metric_value),
    source: String(row.source) as ROISource,
    notes: row.notes != null ? String(row.notes) : null,
    createdAt: new Date(row.created_at),
  };
}

export async function createSnapshot(data: {
  serviceClientId: string;
  snapshotDate: string;
  metricKey: string;
  metricValue: number;
  source?: ROISource;
  notes?: string | null;
}): Promise<ROISnapshot> {
  if (!import.meta.env.DATABASE_URL) throw new Error('DATABASE_URL must be set');
  const rows = await sql`
    INSERT INTO roi_snapshots (service_client_id, snapshot_date, metric_key, metric_value, source, notes)
    VALUES (
      ${data.serviceClientId},
      ${data.snapshotDate},
      ${data.metricKey},
      ${data.metricValue},
      ${data.source ?? 'manual_entry'},
      ${data.notes ?? null}
    )
    ON CONFLICT (service_client_id, snapshot_date, metric_key)
    DO UPDATE SET metric_value = EXCLUDED.metric_value, source = EXCLUDED.source, notes = EXCLUDED.notes
    RETURNING *
  `;
  return rowToSnapshot(rows[0] as Record<string, any>);
}

export async function getSnapshots(
  serviceClientId: string,
  from: string,
  to: string
): Promise<ROISnapshot[]> {
  if (!import.meta.env.DATABASE_URL) return [];
  const rows = await sql`
    SELECT * FROM roi_snapshots
    WHERE service_client_id = ${serviceClientId}
      AND snapshot_date BETWEEN ${from} AND ${to}
    ORDER BY snapshot_date DESC, metric_key ASC
  `;
  return (rows as Record<string, any>[]).map(rowToSnapshot);
}

export async function getLatestSnapshot(
  serviceClientId: string,
  metricKey: string
): Promise<ROISnapshot | null> {
  if (!import.meta.env.DATABASE_URL) return null;
  const rows = await sql`
    SELECT * FROM roi_snapshots
    WHERE service_client_id = ${serviceClientId}
      AND metric_key = ${metricKey}
    ORDER BY snapshot_date DESC
    LIMIT 1
  `;
  const row = rows[0] as Record<string, any> | undefined;
  return row ? rowToSnapshot(row) : null;
}

export async function getROIComparison(
  serviceClientId: string,
  baselineDate: string,
  currentDate: string
): Promise<Record<string, { baseline: number | null; current: number | null; changePct: number | null }>> {
  if (!import.meta.env.DATABASE_URL) return {};

  const rows = await sql`
    SELECT metric_key, snapshot_date, metric_value
    FROM roi_snapshots
    WHERE service_client_id = ${serviceClientId}
      AND snapshot_date IN (${baselineDate}, ${currentDate})
    ORDER BY snapshot_date ASC
  `;

  const byKey: Record<string, { baseline: number | null; current: number | null }> = {};
  for (const row of rows as Array<{ metric_key: string; snapshot_date: string; metric_value: number }>) {
    const key = row.metric_key;
    if (!byKey[key]) byKey[key] = { baseline: null, current: null };
    const dateStr = String(row.snapshot_date).slice(0, 10);
    if (dateStr === baselineDate) byKey[key].baseline = Number(row.metric_value);
    if (dateStr === currentDate) byKey[key].current = Number(row.metric_value);
  }

  const result: Record<string, { baseline: number | null; current: number | null; changePct: number | null }> = {};
  for (const [key, vals] of Object.entries(byKey)) {
    let changePct: number | null = null;
    if (vals.baseline != null && vals.current != null && vals.baseline !== 0) {
      changePct = ((vals.current - vals.baseline) / Math.abs(vals.baseline)) * 100;
    }
    result[key] = { ...vals, changePct };
  }
  return result;
}

/** Returns latest value per metric key for a client — used by the comparison widget */
export async function getLatestMetricsForClient(
  serviceClientId: string
): Promise<Record<string, { latest: number; latestDate: string; earliest: number | null; earliestDate: string | null }>> {
  if (!import.meta.env.DATABASE_URL) return {};
  const rows = await sql`
    SELECT DISTINCT ON (metric_key)
      metric_key,
      metric_value AS latest_value,
      snapshot_date AS latest_date
    FROM roi_snapshots
    WHERE service_client_id = ${serviceClientId}
    ORDER BY metric_key, snapshot_date DESC
  `;
  const latestRows = rows as Array<{ metric_key: string; latest_value: number; latest_date: string }>;

  const earliestRows = await sql`
    SELECT DISTINCT ON (metric_key)
      metric_key,
      metric_value AS earliest_value,
      snapshot_date AS earliest_date
    FROM roi_snapshots
    WHERE service_client_id = ${serviceClientId}
    ORDER BY metric_key, snapshot_date ASC
  ` as Array<{ metric_key: string; earliest_value: number; earliest_date: string }>;

  const result: Record<string, any> = {};
  for (const r of latestRows) {
    result[r.metric_key] = {
      latest: Number(r.latest_value),
      latestDate: String(r.latest_date).slice(0, 10),
      earliest: null,
      earliestDate: null,
    };
  }
  for (const r of earliestRows) {
    if (result[r.metric_key]) {
      result[r.metric_key].earliest = Number(r.earliest_value);
      result[r.metric_key].earliestDate = String(r.earliest_date).slice(0, 10);
    }
  }
  return result;
}
