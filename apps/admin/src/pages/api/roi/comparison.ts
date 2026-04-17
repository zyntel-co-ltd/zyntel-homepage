import type { APIRoute } from 'astro';
import { getLatestMetricsForClient } from '../../../lib/roi.ts';

export const GET: APIRoute = async ({ url }) => {
  try {
    const clientId = url.searchParams.get('serviceClientId');
    if (!clientId) {
      return new Response(JSON.stringify({ error: 'serviceClientId required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const data = await getLatestMetricsForClient(clientId);
    // Transform for the UI: { metricKey: { baseline: earliest, current: latest } }
    const result: Record<string, { baseline: number | null; current: number | null }> = {};
    for (const [key, val] of Object.entries(data)) {
      result[key] = { baseline: val.earliest, current: val.latest };
    }
    return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message ?? 'Server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
