import type { APIRoute } from 'astro';
import { sql } from '@zyntel/db';

export const POST: APIRoute = async () => {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS app_events (
        id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        service_client_id UUID        NOT NULL REFERENCES service_clients(id) ON DELETE CASCADE,
        app               TEXT        NOT NULL,
        environment       TEXT        NOT NULL DEFAULT 'production',
        event_type        TEXT        NOT NULL,
        level             TEXT        NOT NULL DEFAULT 'info'
                          CHECK (level IN ('debug','info','warn','error','critical')),
        message           TEXT        NOT NULL,
        data              JSONB,
        source            TEXT,
        actor             TEXT,
        r2_key            TEXT,
        occurred_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;

    await sql`CREATE INDEX IF NOT EXISTS app_events_scid_idx        ON app_events (service_client_id)`;
    await sql`CREATE INDEX IF NOT EXISTS app_events_occurred_at_idx ON app_events (occurred_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS app_events_event_type_idx  ON app_events (event_type)`;
    await sql`CREATE INDEX IF NOT EXISTS app_events_level_idx       ON app_events (level)`;
    await sql`CREATE INDEX IF NOT EXISTS app_events_app_idx         ON app_events (app)`;

    return new Response(JSON.stringify({ ok: true, message: 'app_events table and indexes ready.' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[apply-log-migrations]', err);
    return new Response(JSON.stringify({ error: err.message ?? 'Migration failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
