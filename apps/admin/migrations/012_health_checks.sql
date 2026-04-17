-- Health check results — requires service_clients from 011_maintenance.sql
-- Retention: results older than 30 days should be deleted by a cron job.
-- Suggested: DELETE FROM health_check_results WHERE checked_at < NOW() - INTERVAL '30 days';

CREATE TABLE IF NOT EXISTS health_check_results (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_client_id UUID NOT NULL REFERENCES service_clients(id) ON DELETE CASCADE,
  checked_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  status            TEXT NOT NULL CHECK (status IN ('up','down','degraded')),
  response_time_ms  INTEGER,
  status_code       INTEGER,
  error_message     TEXT
);

CREATE INDEX IF NOT EXISTS health_check_results_client_time_idx
  ON health_check_results(service_client_id, checked_at DESC);
