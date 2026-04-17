ALTER TABLE preview_clients
  ADD COLUMN IF NOT EXISTS choice_option TEXT,
  ADD COLUMN IF NOT EXISTS choice_comments TEXT,
  ADD COLUMN IF NOT EXISTS choice_submitted_at TIMESTAMPTZ;

