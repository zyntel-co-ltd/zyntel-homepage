ALTER TABLE preview_clients
  ADD COLUMN IF NOT EXISTS choice_answers JSONB;

