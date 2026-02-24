-- Add time_received to track when Receive button was clicked
ALTER TABLE test_records ADD COLUMN IF NOT EXISTS time_received TIMESTAMP;
