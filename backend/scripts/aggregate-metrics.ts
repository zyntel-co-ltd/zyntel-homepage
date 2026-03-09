/**
 * aggregate-metrics.ts - Populate daily/monthly metrics from raw data (3.4)
 *
 * Run before purge to retain aggregates. Charts can migrate to query
 * daily_metrics/monthly_metrics instead of raw test_records.
 *
 * Usage: npx ts-node scripts/aggregate-metrics.ts
 */

import { query } from '../src/config/database';

async function aggregateDaily() {
  console.log('📊 Aggregating daily metrics...');
  await query(`
    INSERT INTO daily_metrics (
      metric_date, lab_section, shift, laboratory,
      total_revenue, test_count, request_count,
      on_time_count, delayed_count, cancelled_count, avg_tat_minutes
    )
    SELECT
      tr.encounter_date::date AS metric_date,
      COALESCE(tr.lab_section_at_test, 'all') AS lab_section,
      COALESCE(tr.shift, 'all') AS shift,
      COALESCE(tr.laboratory, 'all') AS laboratory,
      COALESCE(SUM(tr.price_at_test), 0) AS total_revenue,
      COUNT(*) AS test_count,
      COUNT(DISTINCT tr.encounter_id) AS request_count,
      COUNT(*) FILTER (WHERE tr.is_resulted AND tr.actual_tat IS NOT NULL AND tr.actual_tat <= COALESCE(tr.tat_at_test, 9999)) AS on_time_count,
      COUNT(*) FILTER (WHERE tr.is_resulted AND tr.actual_tat IS NOT NULL AND tr.actual_tat > COALESCE(tr.tat_at_test, 0)) AS delayed_count,
      COUNT(*) FILTER (WHERE tr.is_cancelled) AS cancelled_count,
      AVG(tr.actual_tat) FILTER (WHERE tr.actual_tat IS NOT NULL) AS avg_tat_minutes
    FROM test_records tr
    WHERE tr.encounter_date IS NOT NULL
    GROUP BY tr.encounter_date::date, tr.lab_section_at_test, tr.shift, tr.laboratory
    ON CONFLICT (metric_date, lab_section, shift, laboratory)
    DO UPDATE SET
      total_revenue = EXCLUDED.total_revenue,
      test_count = EXCLUDED.test_count,
      request_count = EXCLUDED.request_count,
      on_time_count = EXCLUDED.on_time_count,
      delayed_count = EXCLUDED.delayed_count,
      cancelled_count = EXCLUDED.cancelled_count,
      avg_tat_minutes = EXCLUDED.avg_tat_minutes,
      created_at = CURRENT_TIMESTAMP
  `);
  console.log('   Daily metrics updated');
}

async function aggregateMonthly() {
  console.log('📊 Aggregating monthly metrics...');
  await query(`
    INSERT INTO monthly_metrics (
      metric_year, metric_month, lab_section, shift, laboratory,
      total_revenue, test_count, request_count,
      on_time_count, delayed_count, cancelled_count, avg_tat_minutes
    )
    SELECT
      EXTRACT(YEAR FROM tr.encounter_date)::int AS metric_year,
      EXTRACT(MONTH FROM tr.encounter_date)::int AS metric_month,
      COALESCE(tr.lab_section_at_test, 'all') AS lab_section,
      COALESCE(tr.shift, 'all') AS shift,
      COALESCE(tr.laboratory, 'all') AS laboratory,
      COALESCE(SUM(tr.price_at_test), 0) AS total_revenue,
      COUNT(*) AS test_count,
      COUNT(DISTINCT tr.encounter_id) AS request_count,
      COUNT(*) FILTER (WHERE tr.is_resulted AND tr.actual_tat IS NOT NULL AND tr.actual_tat <= COALESCE(tr.tat_at_test, 9999)) AS on_time_count,
      COUNT(*) FILTER (WHERE tr.is_resulted AND tr.actual_tat IS NOT NULL AND tr.actual_tat > COALESCE(tr.tat_at_test, 0)) AS delayed_count,
      COUNT(*) FILTER (WHERE tr.is_cancelled) AS cancelled_count,
      AVG(tr.actual_tat) FILTER (WHERE tr.actual_tat IS NOT NULL) AS avg_tat_minutes
    FROM test_records tr
    WHERE tr.encounter_date IS NOT NULL
    GROUP BY EXTRACT(YEAR FROM tr.encounter_date), EXTRACT(MONTH FROM tr.encounter_date),
             tr.lab_section_at_test, tr.shift, tr.laboratory
    ON CONFLICT (metric_year, metric_month, lab_section, shift, laboratory)
    DO UPDATE SET
      total_revenue = EXCLUDED.total_revenue,
      test_count = EXCLUDED.test_count,
      request_count = EXCLUDED.request_count,
      on_time_count = EXCLUDED.on_time_count,
      delayed_count = EXCLUDED.delayed_count,
      cancelled_count = EXCLUDED.cancelled_count,
      avg_tat_minutes = EXCLUDED.avg_tat_minutes,
      created_at = CURRENT_TIMESTAMP
  `);
  console.log('   Monthly metrics updated');
}

async function main() {
  await aggregateDaily();
  await aggregateMonthly();
  console.log('✅ Metrics aggregation complete');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Aggregation failed:', err);
    process.exit(1);
  });
