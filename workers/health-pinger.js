/**
 * DEPLOYMENT NOTE:
 * This Cloudflare Worker requires the following secrets set via `wrangler secret put`:
 *   - DATABASE_URL   — Neon serverless connection string
 *   - RESEND_API_KEY — Resend API key for alert emails
 *
 * Cron trigger: every 5 minutes (*/5 * * * *)
 * Configured in wrangler.toml under [triggers] > crons
 */

import { neon } from '@neondatabase/serverless';

const ALERT_TO = 'ntale@zyntel.net';
const ALERT_CC = 'wycliff@zyntel.net';
const FROM_EMAIL = 'Zyntel Monitor <monitor@zyntel.net>';
const TIMEOUT_MS = 10_000;
const DOWN_STATUS_THRESHOLD = 400;

export default {
  async scheduled(event, env, ctx) {
    const sql = neon(env.DATABASE_URL);

    // Fetch all service clients with a health_check_url
    const clients = await sql`
      SELECT id, name, product_name, health_check_url
      FROM service_clients
      WHERE health_check_url IS NOT NULL AND health_check_url != ''
    `;

    if (!clients.length) return;

    // Get previous status for each client (to detect up→down transitions)
    const previousStatuses = {};
    const prevRows = await sql`
      SELECT DISTINCT ON (service_client_id) service_client_id, status
      FROM health_check_results
      ORDER BY service_client_id, checked_at DESC
    `;
    for (const row of prevRows) {
      previousStatuses[row.service_client_id] = row.status;
    }

    const results = await Promise.allSettled(
      clients.map(async (client) => {
        const startTime = Date.now();
        let status = 'down';
        let responseTimeMs = null;
        let statusCode = null;
        let errorMessage = null;

        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
          const res = await fetch(client.health_check_url, {
            signal: controller.signal,
            redirect: 'follow',
          });
          clearTimeout(timer);
          responseTimeMs = Date.now() - startTime;
          statusCode = res.status;

          if (res.status < DOWN_STATUS_THRESHOLD) {
            status = responseTimeMs > 2000 ? 'degraded' : 'up';
          } else {
            status = 'down';
            errorMessage = `HTTP ${res.status}`;
          }
        } catch (err) {
          responseTimeMs = Date.now() - startTime;
          errorMessage = err.message ?? 'Fetch failed';
          status = 'down';
        }

        // Write result
        await sql`
          INSERT INTO health_check_results (service_client_id, status, response_time_ms, status_code, error_message)
          VALUES (${client.id}, ${status}, ${responseTimeMs}, ${statusCode}, ${errorMessage})
        `;

        // Alert if transitioned from up/degraded → down
        const prevStatus = previousStatuses[client.id];
        const wasUp = prevStatus === 'up' || prevStatus === 'degraded' || prevStatus == null;
        if (status === 'down' && wasUp) {
          await sendAlert(env, client, errorMessage);
        }

        return { clientId: client.id, name: client.name, status };
      })
    );

    console.log('Health check complete:', results.map((r) => r.value ?? r.reason?.message).join(', '));
  },
};

async function sendAlert(env, client, errorMessage) {
  if (!env.RESEND_API_KEY) return;
  const body = {
    from: FROM_EMAIL,
    to: ALERT_TO,
    cc: [ALERT_CC],
    subject: `[DOWN] ${client.product_name} (${client.name}) is unreachable`,
    html: `
      <div style="font-family:sans-serif;padding:24px;max-width:520px;">
        <h2 style="color:#b91c1c;">🔴 Product Down Alert</h2>
        <p><strong>${client.product_name}</strong> for <strong>${client.name}</strong> failed its health check.</p>
        <table style="width:100%;border-collapse:collapse;font-size:13px;margin:16px 0;">
          <tr><td style="padding:4px 0;color:#6b7280;">URL</td><td style="font-weight:600;">${client.health_check_url}</td></tr>
          <tr><td style="padding:4px 0;color:#6b7280;">Error</td><td style="font-weight:600;color:#b91c1c;">${errorMessage ?? 'Unknown error'}</td></tr>
          <tr><td style="padding:4px 0;color:#6b7280;">Time</td><td>${new Date().toISOString()}</td></tr>
        </table>
        <p style="color:#6b7280;font-size:12px;">Zyntel Monitor — zyntel.net</p>
      </div>
    `,
  };
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
