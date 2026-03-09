-- Migration 005: Fix reception status set incorrectly by ingest
-- ============================================================================
-- Problem: ingest-test-records was setting is_received=true, is_resulted from
-- LIMS time_out, and is_urgent from "Not Urgent" (which matched .includes('urgent')).
-- These should come from user interaction (Reception buttons) only.
--
-- Run this ONCE after deploying the ingest fix. Only run if you have NOT yet
-- had staff use the Receive/Result buttons (otherwise you'll lose their clicks).
--
-- To run: psql -U postgres -d zyntel_dashboard_v2 -f migrations/005_fix_reception_status_from_ingest.sql
-- ============================================================================

-- Reset is_received and is_resulted - these should only be set by user clicks
UPDATE test_records SET is_received = false, is_resulted = false;

-- Reset is_urgent - "Not Urgent" was wrongly matching; most were routine
UPDATE test_records SET is_urgent = false;
