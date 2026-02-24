import { query } from '../config/database';
import { FilterParams } from '../types';
import { getPeriodDates } from '../utils/dateUtils';

export const getTrackerData = async (filters: FilterParams, search?: string) => {
  let startDate: Date;
  let endDate: Date;

  if (filters.period && filters.period !== 'custom') {
    const dates = getPeriodDates(filters.period);
    startDate = dates.startDate;
    endDate = dates.endDate;
  } else if (filters.startDate && filters.endDate) {
    startDate = new Date(filters.startDate);
    endDate = new Date(filters.endDate);
  } else {
    const dates = getPeriodDates('thisMonth');
    startDate = dates.startDate;
    endDate = dates.endDate;
  }

  // Always filter by encounter date range and exclude cancelled tests
  const conditions = ['e.encounter_date BETWEEN $1 AND $2', 'tr.is_cancelled = false'];
  const params: any[] = [startDate, endDate];
  let paramCount = 3;

  if (filters.labSection && filters.labSection !== 'all') {
    conditions.push(`LOWER(tr.lab_section_at_test) = LOWER($${paramCount++})`);
    params.push(filters.labSection);
  }

  if (filters.shift && filters.shift !== 'all') {
    conditions.push(`LOWER(e.shift) = LOWER($${paramCount++})`);
    params.push(filters.shift);
  }

  if (filters.laboratory && filters.laboratory !== 'all') {
    conditions.push(`LOWER(TRIM(e.laboratory)) = LOWER(TRIM($${paramCount++}))`);
    params.push(filters.laboratory);
  }

  if (search) {
    conditions.push(
      `(LOWER(tr.test_name) LIKE LOWER($${paramCount}) OR LOWER(e.lab_no) LIKE LOWER($${paramCount}))`
    );
    params.push(`%${search}%`);
    paramCount++;
  }

  const whereClause = conditions.join(' AND ');
  const hasPage = (filters as any).page != null && (filters as any).page !== '';
  const limitNum = Math.min(parseInt(String((filters as any).limit), 10) || 50, 100);

  const baseQuery = `FROM test_records tr
     JOIN encounters e ON tr.encounter_id = e.lab_no
     WHERE ${whereClause}`;
  const orderBy = `ORDER BY e.encounter_date DESC, e.time_in DESC`;

  if (hasPage) {
    const page = Math.max(1, parseInt(String((filters as any).page), 10) || 1);
    const offset = (page - 1) * limitNum;

    const countResult = await query(
      `SELECT COUNT(*) AS total ${baseQuery}`,
      params
    );
    const totalRecords = parseInt(countResult.rows[0].total as string, 10);
    const totalPages = Math.max(1, Math.ceil(totalRecords / limitNum));

    params.push(limitNum, offset);
    const result = await query(
      `SELECT
      tr.id,
      e.encounter_date,
      e.lab_no,
      e.invoice_no,
      e.source,
      e.time_in,
      e.shift,
      e.laboratory,
      tr.test_name,
      tr.lab_section_at_test,
      tr.is_urgent,
      tr.is_received,
      tr.time_in as tr_time_in,
      tr.time_received,
      tr.time_out,
      tr.actual_tat,
      tr.tat_at_test,
      (COALESCE(tr.time_received, tr.time_in, e.time_in) + (COALESCE(tr.tat_at_test, 60)::text || ' minutes')::INTERVAL) as time_expected
     ${baseQuery}
     ${orderBy}
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    const data = result.rows.map((row) => mapTrackerRow(row));
    return { data, totalRecords, totalPages };
  }

  const result = await query(
    `SELECT
      tr.id,
      e.encounter_date,
      e.lab_no,
      e.invoice_no,
      e.source,
      e.time_in,
      e.shift,
      e.laboratory,
      tr.test_name,
      tr.lab_section_at_test,
      tr.is_urgent,
      tr.is_received,
      tr.time_in as tr_time_in,
      tr.time_received,
      tr.time_out,
      tr.actual_tat,
      tr.tat_at_test,
      (COALESCE(tr.time_received, tr.time_in, e.time_in) + (COALESCE(tr.tat_at_test, 60)::text || ' minutes')::INTERVAL) as time_expected
     ${baseQuery}
     ${orderBy}`,
    params
  );

  function mapTrackerRow(row: any) {
    const encounterDate = row.encounter_date instanceof Date
      ? row.encounter_date
      : new Date(row.encounter_date);

    const timeInDate = row.time_in ? new Date(row.time_in) : null;
    const timeReceivedDate = row.time_received ? new Date(row.time_received) : null;
    const timeOutDate = row.time_out ? new Date(row.time_out) : null;
    const timeExpectedDate = row.time_expected ? new Date(row.time_expected) : null;

    const formatTime = (d: Date | null) =>
      d ? d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '';

    const actualTat: number | null =
      typeof row.actual_tat === 'number' ? row.actual_tat : row.actual_tat ? parseInt(row.actual_tat, 10) : null;
    const expectedTat: number | null =
      typeof row.tat_at_test === 'number' ? row.tat_at_test : row.tat_at_test ? parseInt(row.tat_at_test, 10) : null;

    const tat = actualTat ?? expectedTat ?? 0;

    let progress: 'pending' | 'in-progress' | 'completed' = 'pending';
    if (timeOutDate) {
      progress = 'completed';
    } else if (row.is_received) {
      progress = 'in-progress';
    }

    return {
      id: row.id,
      date: encounterDate.toISOString().split('T')[0],
      shift: row.shift,
      labNumber: row.lab_no,
      unit: row.laboratory,
      labSection: row.lab_section_at_test,
      testName: row.test_name,
      timeIn: formatTime(timeInDate),
      urgency: row.is_urgent ? 'urgent' as const : 'routine' as const,
      timeReceived: formatTime(timeReceivedDate),
      tat,
      timeExpected: formatTime(timeExpectedDate),
      progress,
      timeOut: formatTime(timeOutDate),
      timeOutRaw: row.time_out,
      timeExpectedRaw: row.time_expected,
    };
  }

  return result.rows.map((row: any) => mapTrackerRow(row));
};