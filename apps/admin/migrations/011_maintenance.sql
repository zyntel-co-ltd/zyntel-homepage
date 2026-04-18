-- Work order number sequence: WO-{YYYY}-{NNN}
CREATE SEQUENCE IF NOT EXISTS wo_number_seq START 1;

CREATE TABLE IF NOT EXISTS service_clients (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  product_name      TEXT NOT NULL,
  product_type      TEXT NOT NULL DEFAULT 'other'
                    CHECK (product_type IN ('dashboard','web-app','saas','other')),
  contact_name      TEXT NOT NULL,
  contact_email     TEXT NOT NULL,
  health_check_url  TEXT,
  api_url           TEXT,
  api_key_hash      TEXT,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- work_orders defined before maintenance_logs so the FK in maintenance_logs resolves
CREATE TABLE IF NOT EXISTS work_orders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_client_id UUID NOT NULL REFERENCES service_clients(id) ON DELETE CASCADE,
  wo_number         TEXT NOT NULL UNIQUE DEFAULT '',
  title             TEXT NOT NULL,
  description       TEXT NOT NULL DEFAULT '',
  scope_items       JSONB NOT NULL DEFAULT '[]',
  estimated_cost    NUMERIC(12,2),
  currency          TEXT NOT NULL DEFAULT 'UGX',
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','approved','in-progress','completed','invoiced')),
  approved_by       TEXT,
  approved_at       TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS maintenance_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_client_id UUID NOT NULL REFERENCES service_clients(id) ON DELETE CASCADE,
  log_date          DATE NOT NULL DEFAULT CURRENT_DATE,
  type              TEXT NOT NULL CHECK (type IN ('incident','preventive','support')),
  area              TEXT NOT NULL,
  summary           TEXT NOT NULL CHECK (char_length(summary) <= 200),
  action_taken      TEXT NOT NULL DEFAULT '',
  outcome           TEXT NOT NULL DEFAULT '',
  work_order_id     UUID REFERENCES work_orders(id) ON DELETE SET NULL,
  logged_by         TEXT NOT NULL DEFAULT 'Wycliff',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS service_clients_name_idx ON service_clients(name);
CREATE INDEX IF NOT EXISTS maintenance_logs_client_idx ON maintenance_logs(service_client_id);
CREATE INDEX IF NOT EXISTS maintenance_logs_date_idx ON maintenance_logs(log_date);
CREATE INDEX IF NOT EXISTS work_orders_client_idx ON work_orders(service_client_id);
