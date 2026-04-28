-- ROI cadence + service-client optional encrypted API key (for optional pull mode)
-- Requires: 011_maintenance.sql, 013_roi_snapshots.sql, 018_roi_metric_definitions.sql

ALTER TABLE roi_metric_definitions
  ADD COLUMN IF NOT EXISTS cadence TEXT NOT NULL DEFAULT 'daily'
    CHECK (cadence IN ('daily','weekly','monthly'));

ALTER TABLE roi_metric_definitions
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS source_hint TEXT;

-- For optional pull mode (admin -> client app) we may store an encrypted API key
ALTER TABLE service_clients
  ADD COLUMN IF NOT EXISTS api_key_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS roi_last_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS roi_last_sync_error TEXT;

