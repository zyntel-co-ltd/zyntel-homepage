import type { APIRoute } from 'astro';
import { sql } from '@zyntel/db';

export const GET: APIRoute = async ({ url }) => {
  try {
    const clientId = url.searchParams.get('clientId');
    if (!clientId) {
      return new Response(JSON.stringify({ error: 'clientId required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (!import.meta.env.DATABASE_URL) {
      return new Response(JSON.stringify([]), { headers: { 'Content-Type': 'application/json' } });
    }
    const rows = await sql`
      SELECT id, checked_at, status, response_time_ms, status_code, error_message
      FROM health_check_results
      WHERE service_client_id = ${clientId}
        AND checked_at >= now() - interval '24 hours'
      ORDER BY checked_at DESC
      LIMIT 300
    `;
    const data = (rows as any[]).map((r) => ({
      id: String(r.id),
      checkedAt: r.checked_at,
      status: String(r.status),
      responseTimeMs: r.response_time_ms != null ? Number(r.response_time_ms) : null,
      statusCode: r.status_code != null ? Number(r.status_code) : null,
      errorMessage: r.error_message ?? null,
    }));
    return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message ?? 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
