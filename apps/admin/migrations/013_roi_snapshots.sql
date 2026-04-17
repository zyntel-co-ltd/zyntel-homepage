-- ROI snapshots — requires service_clients from 011_maintenance.sql

CREATE TABLE IF NOT EXISTS roi_snapshots (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_client_id UUID NOT NULL REFERENCES service_clients(id) ON DELETE CASCADE,
  snapshot_date     DATE NOT NULL,
  metric_key        TEXT NOT NULL,
  metric_value      NUMERIC NOT NULL,
  source            TEXT NOT NULL DEFAULT 'manual_entry'
                    CHECK (source IN ('api_pull','manual_entry')),
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (service_client_id, snapshot_date, metric_key)
);

CREATE INDEX IF NOT EXISTS roi_snapshots_client_date_idx
  ON roi_snapshots(service_client_id, snapshot_date DESC);
