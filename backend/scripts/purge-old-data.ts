/**
 * purge-old-data.ts - Data purging job (3.4)
 *
 * Purges raw test_records and encounters older than PURGE_WINDOW_MONTHS.
 * Run as cron or manually. Aggregates should be computed into daily_metrics
 * before purging (see docs/METRICS-MIGRATION.md).
 *
 * Usage: PURGE_WINDOW_MONTHS=3 npx ts-node scripts/purge-old-data.ts
 */

import { query } from '../src/config/database';

const PURGE_WINDOW_MONTHS = parseInt(process.env.PURGE_WINDOW_MONTHS || '3', 10);

async function purge() {
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - PURGE_WINDOW_MONTHS);
  const cutoffStr = cutoffDate.toISOString().split('T')[0];

  console.log(`🗑️  Purging raw data older than ${cutoffStr} (${PURGE_WINDOW_MONTHS} months)`);

  // Delete test_records by encounter_date (cascade will handle test_cancellations if needed)
  const trResult = await query(
    `DELETE FROM test_records WHERE encounter_date < $1`,
    [cutoffStr]
  );
  const trDeleted = trResult.rowCount ?? 0;

  // Delete encounters that have no remaining test_records and are old
  const encResult = await query(
    `DELETE FROM encounters e
     WHERE e.encounter_date < $1
     AND NOT EXISTS (SELECT 1 FROM test_records tr WHERE tr.encounter_id = e.lab_no)`,
    [cutoffStr]
  );
  const encDeleted = encResult.rowCount ?? 0;

  console.log(`✅ Purged: ${trDeleted} test_records, ${encDeleted} encounters`);
}

purge()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Purge failed:', err);
    process.exit(1);
  });
