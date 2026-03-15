-- Add 'partial' status for installment payments
-- Run after 005_invoice_extensions.sql

ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_status_check
  CHECK (status IN ('draft', 'sent', 'partial', 'paid', 'overdue', 'cancelled'));
