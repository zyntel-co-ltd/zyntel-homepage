-- Migration 008: Backfill Unit (laboratory) from encounters
-- ============================================================================
-- Fix: test_records with null/empty laboratory - copy from encounters via encounter_id.
-- Run once after migration 006 if Unit column shows N/A in Reception table.
-- ============================================================================

UPDATE test_records tr
SET laboratory = e.laboratory,
    shift = COALESCE(NULLIF(TRIM(tr.shift), ''), e.shift)
FROM encounters e
WHERE tr.encounter_id = e.lab_no
  AND (tr.laboratory IS NULL OR TRIM(COALESCE(tr.laboratory, '')) = '');
