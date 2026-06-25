import type { APIRoute } from 'astro';
import { sql } from '@zyntel/db';

export const POST: APIRoute = async () => {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS quarterly_reports (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        service_client_id UUID NOT NULL REFERENCES service_clients(id) ON DELETE CASCADE,
        quarter           TEXT NOT NULL CHECK (quarter IN ('Q1','Q2','Q3','Q4')),
        year              INT  NOT NULL,
        title             TEXT NOT NULL,
        markdown_content  TEXT NOT NULL DEFAULT '',
        generated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        generated_by      TEXT,
        pdf_url           TEXT,
        status            TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','final')),
        created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS case_studies (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        service_client_id UUID NOT NULL REFERENCES service_clients(id) ON DELETE CASCADE,
        title             TEXT NOT NULL,
        markdown_content  TEXT NOT NULL DEFAULT '',
        summary           TEXT,
        tags              JSONB NOT NULL DEFAULT '[]',
        status            TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
        published_at      TIMESTAMPTZ,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;

    // Add columns introduced after initial migration — safe to run repeatedly
    await sql`ALTER TABLE quarterly_reports ADD COLUMN IF NOT EXISTS data_cursor_date TEXT`;
    await sql`ALTER TABLE quarterly_reports ADD COLUMN IF NOT EXISTS last_refreshed_at TIMESTAMPTZ`;
    await sql`ALTER TABLE quarterly_reports ADD COLUMN IF NOT EXISTS source_data JSONB`;

    // Unique constraint: one draft/final per client per quarter+year
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS quarterly_reports_client_period_uidx
        ON quarterly_reports (service_client_id, quarter, year)
    `;

    return new Response(JSON.stringify({ ok: true, message: 'Reporting tables ready.' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[apply-report-migrations]', err);
    return new Response(JSON.stringify({ error: err.message ?? 'Migration failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
