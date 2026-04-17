/**
 * DEPLOYMENT NOTE:
 * This Cloudflare Worker requires the following secrets set via `wrangler secret put`:
 *   - DATABASE_URL   — Neon serverless connection string
 *   - RESEND_API_KEY — Resend API key for failure alert emails
 *
 * Cron trigger: daily at midnight UTC (0 0 * * *)
 * Configured in wrangler.toml under [triggers] > crons
 *
 * Requires @neondatabase/serverless — install in the workers package.json or as a module.
 */

import { neon } from '@neondatabase/serverless';

const ALERT_TO = 'ntale@zyntel.net';
const FROM_EMAIL = 'Zyntel ROI <monitor@zyntel.net>';

export default {
  async scheduled(event, env, ctx) {
    const sql = neon(env.DATABASE_URL);

    // Get all service clients with a non-null api_url and api_key_hash
    const clients = await sql`
      SELECT id, name, product_name, api_url, api_key_hash
      FROM service_clients
      WHERE api_url IS NOT NULL AND api_url != ''
        AND api_key_hash IS NOT NULL AND api_key_hash != ''
    `;

    if (!clients.length) {
      console.log('[roi-cron] No clients with api_url configured — nothing to do.');
      return;
    }

    const today = new Date().toISOString().slice(0, 10);

    for (const client of clients) {
      try {
        const snapshotUrl = `${client.api_url.replace(/\/$/, '')}/zyntel/v1/snapshot`;

        const res = await fetch(snapshotUrl, {
          headers: { 'X-Zyntel-Key': client.api_key_hash },
          signal: AbortSignal.timeout(15_000),
        });

        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
        }

        const json = await res.json();
        if (!json.success || !json.data) {
          throw new Error(`Unexpected API response: ${JSON.stringify(json).slice(0, 200)}`);
        }

        const snapshot = json.data;

        // Map known metric keys
        const metricMap = {
          avg_tat_minutes: snapshot.avg_tat_minutes,
          total_tests: snapshot.total_tests,
          delay_rate_pct: snapshot.delay_rate_pct,
          revenue_ugx: snapshot.revenue_ugx,
        };

        for (const [metricKey, metricValue] of Object.entries(metricMap)) {
          if (metricValue == null) continue;
          await sql`
            INSERT INTO roi_snapshots (service_client_id, snapshot_date, metric_key, metric_value, source, notes)
            VALUES (${client.id}, ${today}, ${metricKey}, ${metricValue}, 'api_pull', NULL)
            ON CONFLICT (service_client_id, snapshot_date, metric_key)
            DO UPDATE SET metric_value = EXCLUDED.metric_value, source = 'api_pull'
          `;
        }

        console.log(`[roi-cron] Snapshot saved for ${client.name} (${client.product_name})`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[roi-cron] Failed for ${client.name}: ${message}`);
        await sendAlert(env, client, message);
      }
    }
  },
};

async function sendAlert(env, client, errorMessage) {
  if (!env.RESEND_API_KEY) return;
  const body = {
    from: FROM_EMAIL,
    to: ALERT_TO,
    subject: `[ROI Cron] Failed to pull snapshot for ${client.name}`,
    html: `
      <div style="font-family:sans-serif;padding:24px;max-width:520px;">
        <h2>ROI Snapshot Pull Failed</h2>
        <p>The daily cron failed to pull metrics from <strong>${client.product_name}</strong> (${client.name}).</p>
        <table style="font-size:13px;width:100%;border-collapse:collapse;margin:16px 0;">
          <tr><td style="color:#6b7280;padding:4px 0;">API URL</td><td>${client.api_url}</td></tr>
          <tr><td style="color:#6b7280;padding:4px 0;">Error</td><td style="color:#b91c1c;">${errorMessage}</td></tr>
          <tr><td style="color:#6b7280;padding:4px 0;">Date</td><td>${new Date().toISOString()}</td></tr>
        </table>
        <p style="color:#6b7280;font-size:12px;">The next retry is tomorrow's cron run. No data was written for today.</p>
      </div>
    `,
  };
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
