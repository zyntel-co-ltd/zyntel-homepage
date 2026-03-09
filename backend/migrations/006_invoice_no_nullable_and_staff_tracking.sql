-- ============================================================================
-- Migration 006: Invoice numbers nullable + Staff tracking columns
-- ============================================================================
-- 3.3: Make invoice_no nullable - used only during transform/ingest for matching,
--      not persisted long-term.
-- 3.7: Add received_by_id, resulted_by_id for staff performance tracking.
-- ============================================================================

-- Encounters: invoice_no nullable (match-only, no long-term storage)
ALTER TABLE encounters ALTER COLUMN invoice_no DROP NOT NULL;

-- test_records: invoice_no nullable if it exists (003 kept it deprecated)
-- Note: test_records may have encounter_date, invoice_no, lab_no etc from 001;
-- 003 added encounter_id. We make invoice_no nullable.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'test_records' AND column_name = 'invoice_no'
  ) THEN
    ALTER TABLE test_records ALTER COLUMN invoice_no DROP NOT NULL;
  END IF;
END $$;

-- Staff tracking: who received and resulted each test
ALTER TABLE test_records ADD COLUMN IF NOT EXISTS received_by_id INTEGER REFERENCES users(id);
ALTER TABLE test_records ADD COLUMN IF NOT EXISTS resulted_by_id INTEGER REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_test_records_received_by ON test_records(received_by_id);
CREATE INDEX IF NOT EXISTS idx_test_records_resulted_by ON test_records(resulted_by_id);
