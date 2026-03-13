-- Payment accounts (bank details) for invoices
-- Run in Neon SQL Editor after 002_invoices.sql

CREATE TABLE IF NOT EXISTS payment_accounts (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_name TEXT NOT NULL,
  bank_address TEXT,
  swift_code TEXT,
  instructions TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_account_id INTEGER REFERENCES payment_accounts(id);

CREATE INDEX IF NOT EXISTS idx_invoices_payment_account ON invoices(payment_account_id);
