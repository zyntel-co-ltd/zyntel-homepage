import { query } from '../config/database';
import { FilterParams } from '../types';
import { getPeriodDates } from '../utils/dateUtils';
import { getTestsTargetForPeriod } from './testsTargetService';
import moment from 'moment';

export const getTestsData = async (filters: FilterParams) => {
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

  const conditions = ['encounter_date BETWEEN $1 AND $2', 'is_cancelled = false'];
  const params: any[] = [startDate, endDate];
  let paramCount = 3;

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

  // Get total tests performed
  const totalResult = await query(
    `SELECT COUNT(*) as total FROM test_records WHERE ${whereClause}`,
    params
  );
  const totalTestsPerformed = parseInt(totalResult.rows[0].total);

  // Get target for the period
  const targetTestsPerformed = await getTestsTargetForPeriod(startDate, endDate);
  
  // Calculate percentage
  const percentage = targetTestsPerformed > 0 
    ? (totalTestsPerformed / targetTestsPerformed) * 100 
    : 0;

  // Calculate average daily tests
  const daysInPeriod = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  const avgDailyTests = totalTestsPerformed / daysInPeriod;

  // Get test volume trend - FIX: Return proper format
  const volumeTrendResult = await query(
    `SELECT encounter_date::date as date, COUNT(*) as count
     FROM test_records 
     WHERE ${whereClause}
     GROUP BY encounter_date::date 
     ORDER BY encounter_date::date`,
    params
  );

  const testVolumeTrend = volumeTrendResult.rows.map(row => ({
    date: moment(row.date).format('YYYY-MM-DD'),
    count: parseInt(row.count)
  }));

  // Get top tests by hospital unit
  const topTestsResult = await query(
    `SELECT laboratory as unit, test_name, COUNT(*) as count
     FROM test_records 
     WHERE ${whereClause}
     GROUP BY laboratory, test_name
     ORDER BY laboratory, count DESC`,
    params
  );

  // Group by unit
  const topTestsByUnit: { [key: string]: any[] } = {};
  topTestsResult.rows.forEach(row => {
    if (!topTestsByUnit[row.unit]) {
      topTestsByUnit[row.unit] = [];
    }
    if (topTestsByUnit[row.unit].length < 50) {
      topTestsByUnit[row.unit].push({ 
        test_name: row.test_name, 
        count: parseInt(row.count) 
      });
    }
  });

  return {
    totalTestsPerformed,
    targetTestsPerformed,
    percentage,
    avgDailyTests,
    testVolumeTrend,
    topTestsByUnit,
  };
};