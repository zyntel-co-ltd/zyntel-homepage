CREATE TABLE IF NOT EXISTS pitch_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token         UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  label         TEXT NOT NULL,
  audience_name TEXT NOT NULL,
  event_context TEXT NOT NULL,
  deck_folder   TEXT NOT NULL,
  deck_file     TEXT NOT NULL DEFAULT 'pitch-deck.html',
  status        TEXT NOT NULL DEFAULT 'active',
  expiry_date   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pitch_sessions_token_idx ON pitch_sessions(token);
CREATE INDEX IF NOT EXISTS pitch_sessions_status_idx ON pitch_sessions(status);
CREATE INDEX IF NOT EXISTS pitch_sessions_created_at_idx ON pitch_sessions(created_at);

CREATE TABLE IF NOT EXISTS pitch_views (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id       UUID NOT NULL REFERENCES pitch_sessions(id),
  viewed_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_agent       TEXT,
  duration_seconds INT
);

CREATE INDEX IF NOT EXISTS pitch_views_session_id_idx ON pitch_views(session_id);
CREATE INDEX IF NOT EXISTS pitch_views_viewed_at_idx ON pitch_views(viewed_at);

