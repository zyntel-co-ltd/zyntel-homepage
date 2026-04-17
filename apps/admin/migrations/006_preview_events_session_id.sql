ALTER TABLE preview_events
  ADD COLUMN IF NOT EXISTS session_id TEXT;

CREATE INDEX IF NOT EXISTS preview_events_session_id_idx ON preview_events(session_id);

