import { query } from '../config/database';
import { FilterParams } from '../types';
import { getPeriodDates, getChartGranularity } from '../utils/dateUtils';
import moment from 'moment';

/**
 * TAT (Turnaround Time) service - uses patients table.
 * Uses request_delay_status and request_time_out for on-time / delayed / not uploaded.
 */
export const getTATData = async (filters: FilterParams) => {
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

  const startStr = moment(startDate).format('YYYY-MM-DD');
  const endStr = moment(endDate).format('YYYY-MM-DD');
  const conditions = ['date::date BETWEEN $1::date AND $2::date'];
  const params: any[] = [startStr, endStr];
  let paramCount = 3;

  if (filters.labSection && filters.labSection !== 'all') {
    conditions.push(`LOWER(unit) = LOWER($${paramCount++})`);
    params.push(filters.labSection);
  }

  if (filters.shift && filters.shift !== 'all') {
    conditions.push(`LOWER(shift) = LOWER($${paramCount++})`);
    params.push(filters.shift);
  }

  if (filters.laboratory && filters.laboratory !== 'all') {
    if (filters.laboratory === 'Annex') {
      conditions.push(`LOWER(TRIM(unit)) = 'annex'`);
    } else if (filters.laboratory === 'Main Laboratory') {
      conditions.push(`(LOWER(TRIM(unit)) != 'annex' AND unit IS NOT NULL)`);
    } else {
      conditions.push(`LOWER(TRIM(unit)) = LOWER(TRIM($${paramCount++}))`);
      params.push(filters.laboratory);
    }
  }

  const whereClause = conditions.join(' AND ');

  const totalResult = await query(
    `SELECT COUNT(*) as total FROM patients WHERE ${whereClause}`,
    params
  );
  const totalTests = parseInt(totalResult.rows[0].total as string);

  /* Include legacy hyphenated variants (On-Time, Over-Delayed) for backward compatibility with existing DB */
  const delayedLess15Result = await query(
    `SELECT COUNT(*) as cnt FROM patients
     WHERE ${whereClause}
       AND request_delay_status IN ('Delayed', 'Delayed for <15 minutes', 'Delayed for less than 15 minutes')
       AND request_time_out IS NOT NULL`,
    params
  );
  const delayedLess15Tests = parseInt(delayedLess15Result.rows[0].cnt as string);

  const overDelayedResult = await query(
    `SELECT COUNT(*) as cnt FROM patients
     WHERE ${whereClause}
       AND LOWER(request_delay_status) IN ('over delayed', 'over-delayed')
       AND request_time_out IS NOT NULL`,
    params
  );
  const overDelayedTests = parseInt(overDelayedResult.rows[0].cnt as string);

  const onTimeResult = await query(
    `SELECT COUNT(*) as ontime FROM patients
     WHERE ${whereClause}
       AND (LOWER(TRIM(request_delay_status)) IN ('on time', 'on-time', 'ontime') OR request_delay_status = 'Swift')
       AND request_time_out IS NOT NULL`,
    params
  );
  const onTimeTests = parseInt(onTimeResult.rows[0].ontime as string);

  const notUploadedTests = totalTests - (delayedLess15Tests + overDelayedTests + onTimeTests);
  const delayedTests = delayedLess15Tests + overDelayedTests;

  const delayedPercentage = totalTests > 0 ? (delayedTests / totalTests) * 100 : 0;
  const onTimePercentage = totalTests > 0 ? (onTimeTests / totalTests) * 100 : 0;

  const daysInPeriod = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
  const avgDailyDelayed = delayedTests / daysInPeriod;
  const avgDailyOnTime = onTimeTests / daysInPeriod;
  const avgDailyNotUploaded = notUploadedTests / daysInPeriod;

  const granularity = getChartGranularity(filters.period);
  const dailyTrendResult = granularity === 'monthly'
    ? await query(
        `SELECT
           date_trunc('month', date)::date as date,
           COUNT(CASE WHEN request_delay_status IN ('Delayed', 'Delayed for <15 minutes', 'Delayed for less than 15 minutes') AND request_time_out IS NOT NULL THEN 1 END) as delayed_less15,
           COUNT(CASE WHEN LOWER(request_delay_status) IN ('over delayed', 'over-delayed') AND request_time_out IS NOT NULL THEN 1 END) as over_delayed,
           COUNT(CASE WHEN (LOWER(request_delay_status) IN ('on time', 'on-time') OR request_delay_status = 'Swift') AND request_time_out IS NOT NULL THEN 1 END) as on_time,
           COUNT(CASE WHEN request_time_out IS NULL THEN 1 END) as not_uploaded
         FROM patients
         WHERE ${whereClause}
         GROUP BY date_trunc('month', date)
         ORDER BY date_trunc('month', date)`,
        params
      )
    : await query(
        `SELECT
           date::date as date,
           COUNT(CASE WHEN request_delay_status IN ('Delayed', 'Delayed for <15 minutes', 'Delayed for less than 15 minutes') AND request_time_out IS NOT NULL THEN 1 END) as delayed_less15,
           COUNT(CASE WHEN LOWER(request_delay_status) IN ('over delayed', 'over-delayed') AND request_time_out IS NOT NULL THEN 1 END) as over_delayed,
           COUNT(CASE WHEN (LOWER(request_delay_status) IN ('on time', 'on-time') OR request_delay_status = 'Swift') AND request_time_out IS NOT NULL THEN 1 END) as on_time,
           COUNT(CASE WHEN request_time_out IS NULL THEN 1 END) as not_uploaded
         FROM patients
         WHERE ${whereClause}
         GROUP BY date::date
         ORDER BY date::date`,
        params
      );

  const hourlyTrendResult = await query(
    `SELECT
       EXTRACT(HOUR FROM time_in)::integer as hour,
       COUNT(CASE WHEN request_delay_status IN ('Delayed', 'Delayed for <15 minutes', 'Delayed for less than 15 minutes') AND request_time_out IS NOT NULL THEN 1 END) as delayed_less15,
       COUNT(CASE WHEN LOWER(request_delay_status) IN ('over delayed', 'over-delayed') AND request_time_out IS NOT NULL THEN 1 END) as over_delayed,
       COUNT(CASE WHEN (LOWER(request_delay_status) IN ('on time', 'on-time') OR request_delay_status = 'Swift') AND request_time_out IS NOT NULL THEN 1 END) as ontime,
       COUNT(CASE WHEN request_time_out IS NULL THEN 1 END) as not_uploaded
     FROM patients
     WHERE ${whereClause} AND time_in IS NOT NULL
     GROUP BY EXTRACT(HOUR FROM time_in)
     ORDER BY hour`,
    params
  );

  const mostDelayedHour = hourlyTrendResult.rows.reduce(
    (max: any, row: any) => {
      const rowDelayed = parseInt(row.delayed_less15 || 0) + parseInt(row.over_delayed || 0);
      const maxDelayed = parseInt(max?.delayed_less15 || 0) + parseInt(max?.over_delayed || 0);
      return rowDelayed > maxDelayed ? row : max;
    },
    {}
  );
  const mostDelayedDay = dailyTrendResult.rows.reduce(
    (max: any, row: any) => {
      const rowDelayed = parseInt(row.delayed_less15 || 0) + parseInt(row.over_delayed || 0);
      const maxDelayed = parseInt(max?.delayed_less15 || 0) + parseInt(max?.over_delayed || 0);
      return rowDelayed > maxDelayed ? row : max;
    },
    {}
  );

  return {
    pieData: {
      onTime: onTimeTests,
      delayedLess15: delayedLess15Tests,
      overDelayed: overDelayedTests,
      notUploaded: notUploadedTests,
    },
    granularity,
    dailyTrend: dailyTrendResult.rows.map((row: any) => ({
      date: granularity === 'monthly' ? moment(row.date).format('YYYY-MM') : new Date(row.date).toISOString().split('T')[0],
      delayed: parseInt(row.delayed_less15 || 0) + parseInt(row.over_delayed || 0),
      delayedLess15: parseInt(row.delayed_less15 || 0),
      overDelayed: parseInt(row.over_delayed || 0),
      onTime: parseInt(row.on_time),
      notUploaded: parseInt(row.not_uploaded || 0),
    })),
    hourlyTrend: hourlyTrendResult.rows.map((row: any) => ({
      hour: parseInt(row.hour),
      delayed: parseInt(row.delayed_less15 || 0) + parseInt(row.over_delayed || 0),
      delayedLess15: parseInt(row.delayed_less15 || 0),
      overDelayed: parseInt(row.over_delayed || 0),
      onTime: parseInt(row.ontime),
      notUploaded: parseInt(row.not_uploaded || 0),
    })),
    kpis: {
      totalRequests: totalTests,
      delayedRequests: delayedTests,
      onTimeRequests: onTimeTests,
      avgDailyDelayed,
      avgDailyOnTime,
      avgDailyNotUploaded,
      mostDelayedHour: mostDelayedHour?.hour != null ? `${mostDelayedHour.hour}:00 - ${parseInt(mostDelayedHour.hour) + 1}:00` : 'N/A',
      mostDelayedDay: mostDelayedDay?.date ? new Date(mostDelayedDay.date).toLocaleDateString() : 'N/A',
    },
  };
};
