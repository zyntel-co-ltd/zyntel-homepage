CREATE TABLE IF NOT EXISTS preview_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preview_client_id  UUID NOT NULL REFERENCES preview_clients(id) ON DELETE CASCADE,
  occurred_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  event_type         TEXT NOT NULL,
  page               TEXT,
  user_agent         TEXT,
  duration_seconds   INT,
  data               JSONB
);

CREATE INDEX IF NOT EXISTS preview_events_client_id_idx ON preview_events(preview_client_id);
CREATE INDEX IF NOT EXISTS preview_events_occurred_at_idx ON preview_events(occurred_at);

