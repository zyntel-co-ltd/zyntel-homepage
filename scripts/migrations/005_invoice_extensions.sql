-- Invoice extensions: invoice_date, invoice_type, recurring, saved items
-- Run after 004_clients.sql

-- Invoice date (for backdating; displayed on invoice)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_date DATE;
UPDATE invoices SET invoice_date = created_at::date WHERE invoice_date IS NULL;
ALTER TABLE invoices ALTER COLUMN invoice_date SET DEFAULT CURRENT_DATE;

-- Invoice type: one_off, subscription, consultation, other
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_type TEXT DEFAULT 'one_off';
UPDATE invoices SET invoice_type = 'one_off' WHERE invoice_type IS NULL OR invoice_type = '';

-- Recurring config for subscriptions (JSON: { "frequency": "monthly", "next_run": "2025-04-01", "source_invoice_id": 123 })
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS recurring_config JSONB;

CREATE INDEX IF NOT EXISTS idx_invoices_type ON invoices(invoice_type);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date ON invoices(invoice_date);

-- Saved line items (templates for quick add)
CREATE TABLE IF NOT EXISTS saved_items (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  unit_price DECIMAL NOT NULL DEFAULT 0,
  default_quantity INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
