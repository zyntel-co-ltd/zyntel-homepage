/**
 * testAnalyticsService.ts - Single test analytics (3.5)
 * Numbers, revenue, TAT, filters (date, lab section, shift) for one test.
 */
import { query } from '../config/database';
import { FilterParams } from '../types';
import { getPeriodDates } from '../utils/dateUtils';
import { getTestsTargetForPeriod } from './testsTargetService';
import moment from 'moment';

export const getSingleTestAnalytics = async (
  testName: string,
  filters: FilterParams
) => {
  let startDate: Date;
  let endDate: Date;

  if (filters.period && filters.period !== 'custom') {
    const dates = getPeriodDates(filters.period);
    startDate = dates.startDate;
    endDate = dates.endDate;
  } else {
    startDate = filters.startDate ? new Date(filters.startDate) : new Date();
    endDate = filters.endDate ? new Date(filters.endDate) : new Date();
  }

  const conditions = [
    'encounter_date BETWEEN $1 AND $2',
    'is_cancelled = false',
    'LOWER(test_name) = LOWER($3)',
  ];
  const params: any[] = [startDate, endDate, testName];
  let paramCount = 4;

  if (filters.labSection && filters.labSection !== 'all') {
    conditions.push(`LOWER(lab_section_at_test) = LOWER($${paramCount++})`);
    params.push(filters.labSection);
  }

  if (filters.shift && filters.shift !== 'all') {
    conditions.push(`LOWER(shift) = LOWER($${paramCount++})`);
    params.push(filters.shift);
  }

  if (filters.laboratory && filters.laboratory !== 'all') {
    if (filters.laboratory === 'Annex') {
      conditions.push(`LOWER(TRIM(laboratory)) = 'annex'`);
    } else if (filters.laboratory === 'Main Laboratory') {
      conditions.push(`(LOWER(TRIM(laboratory)) != 'annex' AND laboratory IS NOT NULL)`);
    } else {
      conditions.push(`LOWER(TRIM(laboratory)) = LOWER(TRIM($${paramCount++}))`);
      params.push(filters.laboratory);
    }
  }

  const whereClause = conditions.join(' AND ');

  const totalResult = await query(
    `SELECT COUNT(*) as total FROM test_records WHERE ${whereClause}`,
    params
  );
  const totalCount = parseInt(totalResult.rows[0].total);

  const revenueResult = await query(
    `SELECT COALESCE(SUM(price_at_test), 0) as total_revenue FROM test_records WHERE ${whereClause}`,
    params
  );
  const totalRevenue = parseFloat(revenueResult.rows[0].total_revenue);

  const tatResult = await query(
    `SELECT 
       AVG(actual_tat) FILTER (WHERE actual_tat IS NOT NULL) as avg_tat,
       COUNT(*) FILTER (WHERE is_resulted AND actual_tat IS NOT NULL AND actual_tat <= COALESCE(tat_at_test, 9999)) as on_time,
       COUNT(*) FILTER (WHERE is_resulted AND actual_tat IS NOT NULL AND actual_tat > COALESCE(tat_at_test, 0)) as delayed,
       COUNT(*) FILTER (WHERE is_resulted AND actual_tat IS NULL) as no_tat
     FROM test_records WHERE ${whereClause}`,
    params
  );
  const tatRow = tatResult.rows[0];
  const avgTat = tatRow?.avg_tat ? parseFloat(tatRow.avg_tat) : null;
  const onTimeCount = parseInt(tatRow?.on_time || 0);
  const delayedCount = parseInt(tatRow?.delayed || 0);
  const noTatCount = parseInt(tatRow?.no_tat || 0);

  const targetTests = await getTestsTargetForPeriod(startDate, endDate);
  const percentage = targetTests > 0 ? (totalCount / targetTests) * 100 : 0;
  const daysInPeriod = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  const avgDailyTests = totalCount / daysInPeriod;

  const volumeTrendResult = await query(
    `SELECT encounter_date::date as date, COUNT(*) as count
     FROM test_records WHERE ${whereClause}
     GROUP BY encounter_date::date ORDER BY encounter_date::date`,
    params
  );
  const testVolumeTrend = volumeTrendResult.rows.map((row) => ({
    date: moment(row.date).format('YYYY-MM-DD'),
    count: parseInt(row.count),
  }));

  const revenueTrendResult = await query(
    `SELECT encounter_date::date as date, COALESCE(SUM(price_at_test), 0) as revenue
     FROM test_records WHERE ${whereClause}
     GROUP BY encounter_date::date ORDER BY encounter_date::date`,
    params
  );
  const revenueTrend = revenueTrendResult.rows.map((row) => ({
    date: moment(row.date).format('YYYY-MM-DD'),
    revenue: parseFloat(row.revenue),
  }));

  return {
    testName,
    totalCount,
    totalRevenue,
    avgTat,
    onTimeCount,
    delayedCount,
    noTatCount,
    percentage,
    avgDailyTests,
    testVolumeTrend,
    revenueTrend,
  };
};

export const getTestNamesForSearch = async (search?: string): Promise<string[]> => {
  let sql = 'SELECT DISTINCT test_name FROM test_metadata ORDER BY test_name';
  const params: any[] = [];
  if (search && search.trim()) {
    sql = 'SELECT DISTINCT test_name FROM test_metadata WHERE LOWER(test_name) LIKE LOWER($1) ORDER BY test_name LIMIT 50';
    params.push(`%${search.trim()}%`);
  }
  const result = await query(sql, params);
  return result.rows.map((r) => r.test_name);
};
