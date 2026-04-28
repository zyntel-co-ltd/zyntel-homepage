import { sql } from '@zyntel/db';
import type { ROIMetricDefinition, ROIMetricDirection, ROIMetricFormat, ROIMetricCadence } from '@zyntel/db/schema';

function rowToDef(row: Record<string, any>): ROIMetricDefinition {
  return {
    key: String(row.key),
    label: String(row.label),
    unit: row.unit != null ? String(row.unit) : null,
    direction: String(row.direction) as ROIMetricDirection,
    format: String(row.format) as ROIMetricFormat,
    cadence: (row.cadence ?? 'daily') as ROIMetricCadence,
    description: row.description != null ? String(row.description) : null,
    sourceHint: row.source_hint != null ? String(row.source_hint) : null,
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
  cadence?: ROIMetricCadence;
  description?: string | null;
  sourceHint?: string | null;
}): Promise<ROIMetricDefinition> {
  if (!import.meta.env.DATABASE_URL) throw new Error('DATABASE_URL must be set');
  const rows = await sql`
    INSERT INTO roi_metric_definitions (key, label, unit, direction, format, cadence, description, source_hint)
    VALUES (
      ${data.key},
      ${data.label},
      ${data.unit ?? null},
      ${data.direction ?? 'higher_is_better'},
      ${data.format ?? 'number'},
      ${data.cadence ?? 'daily'},
      ${data.description ?? null},
      ${data.sourceHint ?? null}
    )
    ON CONFLICT (key)
    DO UPDATE SET
      label = EXCLUDED.label,
      unit = EXCLUDED.unit,
      direction = EXCLUDED.direction,
      format = EXCLUDED.format,
      cadence = EXCLUDED.cadence,
      description = EXCLUDED.description,
      source_hint = EXCLUDED.source_hint,
      updated_at = now()
    RETURNING *
  `;
  return rowToDef(rows[0] as Record<string, any>);
}

