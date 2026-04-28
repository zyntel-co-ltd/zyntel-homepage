import { sql } from '@zyntel/db';
import type { ROIMetricDefinition, ROIMetricDirection, ROIMetricFormat } from '@zyntel/db/schema';

function rowToDef(row: Record<string, any>): ROIMetricDefinition {
  return {
    key: String(row.key),
    label: String(row.label),
    unit: row.unit != null ? String(row.unit) : null,
    direction: String(row.direction) as ROIMetricDirection,
    format: String(row.format) as ROIMetricFormat,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export async function listROIMetricDefinitions(): Promise<ROIMetricDefinition[]> {
  if (!import.meta.env.DATABASE_URL) return [];
  try {
    const rows = await sql`SELECT * FROM roi_metric_definitions ORDER BY label ASC`;
    return (rows as Record<string, any>[]).map(rowToDef);
  } catch {
    return [];
  }
}

export async function upsertROIMetricDefinition(data: {
  key: string;
  label: string;
  unit?: string | null;
  direction?: ROIMetricDirection;
  format?: ROIMetricFormat;
}): Promise<ROIMetricDefinition> {
  if (!import.meta.env.DATABASE_URL) throw new Error('DATABASE_URL must be set');
  const rows = await sql`
    INSERT INTO roi_metric_definitions (key, label, unit, direction, format)
    VALUES (
      ${data.key},
      ${data.label},
      ${data.unit ?? null},
      ${data.direction ?? 'higher_is_better'},
      ${data.format ?? 'number'}
    )
    ON CONFLICT (key)
    DO UPDATE SET
      label = EXCLUDED.label,
      unit = EXCLUDED.unit,
      direction = EXCLUDED.direction,
      format = EXCLUDED.format,
      updated_at = now()
    RETURNING *
  `;
  return rowToDef(rows[0] as Record<string, any>);
}

