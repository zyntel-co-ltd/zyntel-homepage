CREATE TABLE IF NOT EXISTS preview_feedback_submissions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preview_client_id  UUID NOT NULL REFERENCES preview_clients(id) ON DELETE CASCADE,
  occurred_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  session_id         TEXT,
  choice_option      TEXT,
  choice_comments    TEXT,
  choice_answers     JSONB
);

CREATE INDEX IF NOT EXISTS preview_feedback_submissions_client_id_idx ON preview_feedback_submissions(preview_client_id);
CREATE INDEX IF NOT EXISTS preview_feedback_submissions_occurred_at_idx ON preview_feedback_submissions(occurred_at);

