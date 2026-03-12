-- Run this in Neon SQL Editor to create tables for zyntel.net

CREATE TABLE IF NOT EXISTS leads (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contact_submissions (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_events (
  id SERIAL PRIMARY KEY,
  tx_ref TEXT,
  flw_ref TEXT,
  amount DECIMAL,
  currency TEXT,
  status TEXT,
  customer_email TEXT,
  meta JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
