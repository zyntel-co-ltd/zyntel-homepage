ALTER TABLE preview_clients
  ADD COLUMN IF NOT EXISTS decision_answers JSONB,
  ADD COLUMN IF NOT EXISTS decision_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS decision_session_id TEXT;

CREATE INDEX IF NOT EXISTS preview_clients_decision_updated_at_idx ON preview_clients(decision_updated_at);

