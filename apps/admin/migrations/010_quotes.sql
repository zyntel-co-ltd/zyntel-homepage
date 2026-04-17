-- Quote number sequence: Q-{YYYY}-{NNN}
CREATE SEQUENCE IF NOT EXISTS quote_number_seq START 1;

CREATE TABLE IF NOT EXISTS quotes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number TEXT NOT NULL UNIQUE DEFAULT '',
  client_id    INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  title        TEXT NOT NULL,
  line_items   JSONB NOT NULL DEFAULT '[]',
  subtotal     NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_rate     NUMERIC(5,2) NOT NULL DEFAULT 0,
  total        NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency     TEXT NOT NULL DEFAULT 'UGX',
  status       TEXT NOT NULL DEFAULT 'draft'
               CHECK (status IN ('draft','sent','accepted','declined','converted')),
  valid_until  DATE,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS quotes_client_id_idx ON quotes(client_id);
CREATE INDEX IF NOT EXISTS quotes_status_idx ON quotes(status);
