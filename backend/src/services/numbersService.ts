import { query } from '../config/database';
import { FilterParams } from '../types';
import { getPeriodDates } from '../utils/dateUtils';
import { getNumbersTargetForPeriod } from './numbersTargetService';
import moment from 'moment';

/**
 * Numbers (requests) service - uses patients table (lab encounters).
 * One row per request/encounter; targets from monthly_numbers_targets.
 */
export const getNumbersData = async (filters: FilterParams) => {
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

  if (filters.shift && filters.shift !== 'all') {
    conditions.push(`LOWER(shift) = LOWER($${paramCount++})`);
    params.push(filters.shift);
  }

  if (filters.laboratory && filters.laboratory !== 'all') {
    conditions.push(`LOWER(TRIM(unit)) = LOWER(TRIM($${paramCount++}))`);
    params.push(filters.laboratory);
  }

  const whereClause = conditions.join(' AND ');

  const totalResult = await query(
    `SELECT COUNT(*) as total FROM patients WHERE ${whereClause}`,
    params
  );
  const totalRequests = parseInt(totalResult.rows[0].total as string);

  const targetRequests = await getNumbersTargetForPeriod(startDate, endDate);
  const percentage = targetRequests > 0
    ? (totalRequests / targetRequests) * 100
    : 0;

  const daysInPeriod = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  const avgDailyRequests = totalRequests / daysInPeriod;

  const dailyVolumeResult = await query(
    `SELECT date::date as date, COUNT(*) as count
     FROM patients
     WHERE ${whereClause}
     GROUP BY date::date
     ORDER BY date::date`,
    params
  );

  const dailyVolume = dailyVolumeResult.rows.map((row: any) => ({
    date: moment(row.date).format('YYYY-MM-DD'),
    count: parseInt(row.count),
  }));

  const hourlyVolumeResult = await query(
    `SELECT EXTRACT(HOUR FROM time_in)::integer as hour, COUNT(*) as count
     FROM patients
     WHERE ${whereClause} AND time_in IS NOT NULL
     GROUP BY EXTRACT(HOUR FROM time_in)
     ORDER BY hour`,
    params
  );

  const hourlyVolume = Array.from({ length: 24 }, (_, hour) => {
    const found = hourlyVolumeResult.rows.find((row: any) => parseInt(row.hour) === hour);
    return {
      hour,
      count: found ? parseInt(found.count) : 0,
    };
  });

  const busiestHourRow = hourlyVolumeResult.rows.reduce(
    (max: any, row: any) => (parseInt(row.count) > parseInt(max?.count || 0) ? row : max),
    {}
  );
  const busiestDayRow = dailyVolumeResult.rows.reduce(
    (max: any, row: any) => (parseInt(row.count) > parseInt(max?.count || 0) ? row : max),
    {}
  );

  const busiestHour = busiestHourRow?.hour != null
    ? `${busiestHourRow.hour}:00 - ${parseInt(busiestHourRow.hour) + 1}:00`
    : 'N/A';
  const busiestDay = busiestDayRow?.date
    ? `${moment(busiestDayRow.date).format('MMM DD, YYYY')} (${busiestDayRow.count} requests)`
    : 'N/A';

  return {
    totalRequests,
    targetRequests,
    percentage,
    avgDailyRequests,
    busiestHour,
    busiestDay,
    dailyVolume,
    hourlyVolume,
  };
};
