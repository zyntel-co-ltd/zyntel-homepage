import { query } from '../config/database';
import { FilterParams } from '../types';
import { getPeriodDates } from '../utils/dateUtils';
import moment from 'moment';

export const getPerformanceData = async (filters: FilterParams) => {
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
  const hasPage = (filters as any).page != null && (filters as any).page !== '';
  const limitNum = Math.min(parseInt(String((filters as any).limit), 10) || 50, 100);

  if (hasPage) {
    const page = Math.max(1, parseInt(String((filters as any).page), 10) || 1);
    const offset = (page - 1) * limitNum;

    const countResult = await query(
      `SELECT COUNT(*) AS total FROM patients WHERE ${whereClause}`,
      params
    );
    const totalRecords = parseInt(countResult.rows[0].total as string, 10);
    const totalPages = Math.max(1, Math.ceil(totalRecords / limitNum));

    params.push(limitNum, offset);
    const result = await query(
      `SELECT 
      date,
      shift AS "Shift",
      lab_number,
      unit AS "Hospital_Unit",
      time_in,
      daily_tat,
      request_time_expected,
      request_time_out,
      request_delay_status,
      request_time_range
     FROM patients 
     WHERE ${whereClause}
     ORDER BY date DESC, time_in DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    return { data: result.rows, totalRecords, totalPages };
  }

  const result = await query(
    `SELECT 
      date,
      shift AS "Shift",
      lab_number,
      unit AS "Hospital_Unit",
      time_in,
      daily_tat,
      request_time_expected,
      request_time_out,
      request_delay_status,
      request_time_range
     FROM patients 
     WHERE ${whereClause}
     ORDER BY date DESC, time_in DESC`,
    params
  );

  return result.rows;
};