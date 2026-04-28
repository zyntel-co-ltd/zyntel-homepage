import type { APIRoute } from 'astro';
import { listROIMetricDefinitions, upsertROIMetricDefinition } from '../../../lib/roi-metrics.ts';

export const GET: APIRoute = async () => {
  const defs = await listROIMetricDefinitions();
  return new Response(JSON.stringify(defs), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const key = String(body.key ?? '').trim();
    const label = String(body.label ?? '').trim();
    if (!key || !label) {
      return new Response(JSON.stringify({ error: 'key and label required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    const def = await upsertROIMetricDefinition({
      key,
      label,
      unit: body.unit ?? null,
      direction: body.direction,
      format: body.format,
    });
    return new Response(JSON.stringify(def), { status: 201, headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message ?? 'Server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

