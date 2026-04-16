CREATE TABLE IF NOT EXISTS preview_clients (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id         TEXT NOT NULL UNIQUE,
  name              TEXT NOT NULL,
  email             TEXT NOT NULL,
  project_type      TEXT NOT NULL DEFAULT 'website-design',
  client_folder     TEXT NOT NULL,
  presentation_file TEXT NOT NULL,
  token             UUID NOT NULL DEFAULT gen_random_uuid(),
  status            TEXT NOT NULL DEFAULT 'active',
  expiry_date       TIMESTAMPTZ NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  intake            JSONB
);

CREATE INDEX IF NOT EXISTS preview_clients_token_idx ON preview_clients(token);
CREATE INDEX IF NOT EXISTS preview_clients_client_id_idx ON preview_clients(client_id);
