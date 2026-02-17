-- ============================================================================
-- Migration 004: Fix Patients Table Schema
-- ============================================================================
-- The patients table was incorrectly created for patient personal info.
-- In Flask, the patients table is for LAB ENCOUNTERS, not patient demographics.
-- This migration renames the old table and creates the correct one.
-- ============================================================================

-- 1. Rename the old patients table (save it as patient_demographics if needed)
ALTER TABLE IF EXISTS patients RENAME TO patient_demographics_backup;

-- 2. Create the CORRECT patients table matching Flask's schema
-- Note: client_id reference removed as clients table doesn't exist in React app
CREATE TABLE IF NOT EXISTS patients (
    lab_number TEXT PRIMARY KEY,
    client TEXT,
    date DATE NOT NULL,
    shift TEXT,
    unit TEXT,
    time_in TIMESTAMP,
    daily_tat NUMERIC,
    request_time_expected TIMESTAMP,
    request_time_out TIMESTAMP,
    request_delay_status TEXT,
    request_time_range TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_patients_date ON patients(date);
CREATE INDEX IF NOT EXISTS idx_patients_shift ON patients(shift);
CREATE INDEX IF NOT EXISTS idx_patients_unit ON patients(unit);
CREATE INDEX IF NOT EXISTS idx_patients_time_in ON patients(time_in);

-- 4. Drop the patient_id column from test_records (it was wrong)
ALTER TABLE test_records DROP COLUMN IF EXISTS patient_id;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify migration success:
-- \d patients
-- SELECT COUNT(*) FROM patients;
