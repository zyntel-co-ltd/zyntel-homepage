-- Work order: contract vs billable vs goodwill (maintenance scope clarity)
ALTER TABLE work_orders
  ADD COLUMN IF NOT EXISTS coverage TEXT NOT NULL DEFAULT 'contract_included'
  CHECK (coverage IN ('contract_included', 'paid_extra', 'goodwill_free'));

-- Logged-by must be entered in the app (no implicit default in DB)
ALTER TABLE maintenance_logs
  ALTER COLUMN logged_by DROP DEFAULT;
