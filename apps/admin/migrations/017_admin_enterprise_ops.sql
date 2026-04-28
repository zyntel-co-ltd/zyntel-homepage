-- Enterprise operations enhancements:
-- - Centralize client identity across modules
-- - Add external observability links
-- - Add approval metadata for work orders and quotes
-- - Allow pitch decks to be uploaded (R2) and served via gated endpoint

-- 1) Preview clients link to canonical billing client (clients.id)
ALTER TABLE preview_clients
  ADD COLUMN IF NOT EXISTS invoice_client_id INT REFERENCES clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS preview_clients_invoice_client_id_idx ON preview_clients(invoice_client_id);

-- 2) Service clients: store observability + repo links
ALTER TABLE service_clients
  ADD COLUMN IF NOT EXISTS repo_url TEXT,
  ADD COLUMN IF NOT EXISTS sentry_url TEXT,
  ADD COLUMN IF NOT EXISTS cronitor_url TEXT;

-- 3) Work orders: two-approver sign-off (roles are free-text)
ALTER TABLE work_orders
  ADD COLUMN IF NOT EXISTS approver1_name TEXT,
  ADD COLUMN IF NOT EXISTS approver1_role TEXT,
  ADD COLUMN IF NOT EXISTS approver1_signed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approver2_name TEXT,
  ADD COLUMN IF NOT EXISTS approver2_role TEXT,
  ADD COLUMN IF NOT EXISTS approver2_signed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (approval_status IN ('draft','pending','approved','rejected'));

CREATE INDEX IF NOT EXISTS work_orders_approval_status_idx ON work_orders(approval_status);

-- 4) Quotes: add a standard disclaimer / overage terms area and approval fields
ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS terms TEXT,
  ADD COLUMN IF NOT EXISTS overage_disclaimer TEXT,
  ADD COLUMN IF NOT EXISTS approver1_name TEXT,
  ADD COLUMN IF NOT EXISTS approver1_role TEXT,
  ADD COLUMN IF NOT EXISTS approver1_signed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approver2_name TEXT,
  ADD COLUMN IF NOT EXISTS approver2_role TEXT,
  ADD COLUMN IF NOT EXISTS approver2_signed_at TIMESTAMPTZ;

-- 5) Pitch sessions: optionally serve deck from R2 via /pd (controlled), instead of static /pitches/*
ALTER TABLE pitch_sessions
  ADD COLUMN IF NOT EXISTS r2_prefix TEXT,
  ADD COLUMN IF NOT EXISTS entry_path TEXT;

CREATE INDEX IF NOT EXISTS pitch_sessions_r2_prefix_idx ON pitch_sessions(r2_prefix);

