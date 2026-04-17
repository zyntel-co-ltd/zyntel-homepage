ALTER TABLE preview_clients
  ADD COLUMN IF NOT EXISTS staging_url TEXT,
  ADD COLUMN IF NOT EXISTS staging_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS staging_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS production_url TEXT,
  ADD COLUMN IF NOT EXISTS production_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS production_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS preview_clients_staging_enabled_idx ON preview_clients(staging_enabled);
CREATE INDEX IF NOT EXISTS preview_clients_production_enabled_idx ON preview_clients(production_enabled);

