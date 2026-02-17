import { query } from '../config/database';
import { FilterParams } from '../types';
import { getPeriodDates } from '../utils/dateUtils';
import moment from 'moment';

export const getRevenueData = async (filters: FilterParams) => {
  let startDate: Date;
  let endDate: Date;

  // Handle period or custom date range
  if (filters.period && filters.period !== 'custom') {
    const dates = getPeriodDates(filters.period);
    startDate = dates.startDate;
    endDate = dates.endDate;
  } else {
    startDate = filters.startDate ? new Date(filters.startDate) : new Date();
    endDate = filters.endDate ? new Date(filters.endDate) : new Date();
  }

  // Build WHERE clause
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
    conditions.push(`LOWER(TRIM(laboratory)) = LOWER(TRIM($${paramCount++}))`);
    params.push(filters.laboratory);
  }

  const whereClause = conditions.join(' AND ');

  // Get total revenue
  const totalResult = await query(
    `SELECT COALESCE(SUM(price_at_test), 0) as total_revenue 
     FROM test_records 
     WHERE ${whereClause}`,
    params
  );

  const totalRevenue = parseFloat(totalResult.rows[0].total_revenue);

  // Get monthly target
  const currentMonth = moment(endDate).month() + 1;
  const currentYear = moment(endDate).year();
  
  const targetResult = await query(
    `SELECT value FROM settings 
     WHERE key = 'monthly_revenue_target' 
     AND month = $1 AND year = $2`,
    [currentMonth, currentYear]
  );

  const targetRevenue = targetResult.rows.length > 0 
    ? parseFloat(targetResult.rows[0].value) 
    : 1500000000; // Default 1.5B

  // Calculate percentage
  const percentage = (totalRevenue / targetRevenue) * 100;

  // Get daily revenue
  const dailyResult = await query(
    `SELECT encounter_date::date as date, 
            COALESCE(SUM(price_at_test), 0) as revenue 
     FROM test_records 
     WHERE ${whereClause}
     GROUP BY encounter_date::date 
     ORDER BY encounter_date::date`,
    params
  );

  const dailyRevenue = dailyResult.rows.map(row => ({
    date: moment(row.date).format('YYYY-MM-DD'),
    revenue: parseFloat(row.revenue),
  }));

  // Calculate average daily revenue
  const daysInPeriod = moment(endDate).diff(moment(startDate), 'days') + 1;
  const avgDailyRevenue = totalRevenue / daysInPeriod;

  // Get revenue by lab section
  const sectionResult = await query(
    `SELECT lab_section_at_test as section, 
            COALESCE(SUM(price_at_test), 0) as revenue 
     FROM test_records 
     WHERE ${whereClause}
     GROUP BY lab_section_at_test 
     ORDER BY revenue DESC`,
    params
  );

  const sectionRevenue = sectionResult.rows.map(row => ({
    section: row.section,
    revenue: parseFloat(row.revenue),
  }));

  // Get top 50 tests by revenue
  const testResult = await query(
    `SELECT test_name, 
            COALESCE(SUM(price_at_test), 0) as revenue 
     FROM test_records 
     WHERE ${whereClause}
     GROUP BY test_name 
     ORDER BY revenue DESC 
     LIMIT 50`,
    params
  );

  const testRevenue = testResult.rows.map(row => ({
    test_name: row.test_name,
    revenue: parseFloat(row.revenue),
  }));

  // Get revenue by hospital unit
  const unitResult = await query(
    `SELECT laboratory as unit, 
            COALESCE(SUM(price_at_test), 0) as revenue 
     FROM test_records 
     WHERE ${whereClause}
     GROUP BY laboratory 
     ORDER BY revenue DESC`,
    params
  );

  const hospitalUnitRevenue = unitResult.rows.map(row => ({
    unit: row.unit,
    revenue: parseFloat(row.revenue),
  }));

  // Calculate growth rate (compare to previous period)
  const periodLength = moment(endDate).diff(moment(startDate), 'days');
  const previousStartDate = moment(startDate).subtract(periodLength, 'days').toDate();
  const previousEndDate = moment(startDate).subtract(1, 'day').toDate();

  const previousParams = [previousStartDate, previousEndDate, ...params.slice(2)];

  const previousResult = await query(
    `SELECT COALESCE(SUM(price_at_test), 0) as total_revenue 
     FROM test_records 
     WHERE encounter_date BETWEEN $1 AND $2 AND is_cancelled = false ${
       params.length > 2 ? `AND ${conditions.slice(1).join(' AND ')}` : ''
     }`,
    previousParams
  );

  const previousRevenue = parseFloat(previousResult.rows[0].total_revenue);
  const revenueGrowthRate = previousRevenue > 0 
    ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 
    : 0;

  return {
    totalRevenue,
    targetRevenue,
    percentage,
    avgDailyRevenue,
    revenueGrowthRate,
    dailyRevenue,
    sectionRevenue,
    testRevenue,
    hospitalUnitRevenue,
  };
};

export const getAvailableLabSections = async () => {
  const result = await query(
    `SELECT DISTINCT lab_section_at_test as section 
     FROM test_records 
     WHERE lab_section_at_test IS NOT NULL 
     ORDER BY section`
  );
  
  return result.rows.map(row => row.section);
};