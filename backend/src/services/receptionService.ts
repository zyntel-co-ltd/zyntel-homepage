import { query, transaction } from '../config/database';
import { FilterParams } from '../types';
import { getPeriodDates } from '../utils/dateUtils';
import { emitToReception } from '../config/socket';

export const getReceptionData = async (filters: FilterParams, search?: string) => {
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

  const conditions = ['tr.encounter_date BETWEEN $1 AND $2'];
  const params: any[] = [startDate, endDate];
  let paramCount = 3;

  if (filters.labSection && filters.labSection !== 'all') {
    conditions.push(`LOWER(tr.lab_section_at_test) = LOWER($${paramCount++})`);
    params.push(filters.labSection);
  }

  if (filters.shift && filters.shift !== 'all') {
    conditions.push(`LOWER(COALESCE(tr.shift, e.shift, '')) = LOWER($${paramCount++})`);
    params.push(filters.shift);
  }

  if (filters.laboratory && filters.laboratory !== 'all') {
    const labCol = 'COALESCE(tr.laboratory, e.laboratory)';
    if (filters.laboratory === 'Annex') {
      conditions.push(`LOWER(TRIM(${labCol})) = 'annex'`);
    } else if (filters.laboratory === 'Main Laboratory') {
      conditions.push(`(LOWER(TRIM(${labCol})) != 'annex' AND ${labCol} IS NOT NULL AND ${labCol} != '')`);
    } else {
      conditions.push(`LOWER(TRIM(${labCol})) = LOWER(TRIM($${paramCount++}))`);
      params.push(filters.laboratory);
    }
  }

  if (search) {
    conditions.push(`(LOWER(tr.test_name) LIKE LOWER($${paramCount}) OR LOWER(tr.lab_no) LIKE LOWER($${paramCount}) OR LOWER(tr.encounter_id) LIKE LOWER($${paramCount}))`);
    params.push(`%${search}%`);
    paramCount++;
  }

  const whereClause = conditions.join(' AND ');
  const hasPage = (filters as any).page != null && (filters as any).page !== '';
  const limitNum = Math.min(parseInt(String((filters as any).limit), 10) || 50, 100);

  const selectCols = `tr.id,
      tr.encounter_date,
      COALESCE(tr.lab_no, tr.encounter_id) AS lab_no,
      COALESCE(tr.shift, e.shift) AS shift,
      COALESCE(NULLIF(TRIM(tr.laboratory), ''), NULLIF(TRIM(e.laboratory), '')) AS laboratory,
      tr.lab_section_at_test,
      tr.test_name,
      tr.is_urgent,
      tr.is_received,
      tr.is_resulted,
      tr.is_cancelled,
      tr.cancellation_reason,
      tr.time_in,
      tr.time_out,
      tr.actual_tat`;

  if (hasPage) {
    const page = Math.max(1, parseInt(String((filters as any).page), 10) || 1);
    const offset = (page - 1) * limitNum;

    const countResult = await query(
      `SELECT COUNT(*) AS total FROM test_records tr
       LEFT JOIN encounters e ON tr.encounter_id = e.lab_no
       WHERE ${whereClause}`,
      params
    );
    const totalRecords = parseInt(countResult.rows[0].total as string, 10);
    const totalPages = Math.max(1, Math.ceil(totalRecords / limitNum));

    params.push(limitNum, offset);
    const result = await query(
      `SELECT ${selectCols}
     FROM test_records tr
     LEFT JOIN encounters e ON tr.encounter_id = e.lab_no
     WHERE ${whereClause}
     ORDER BY tr.encounter_date DESC, tr.time_in DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    return { data: result.rows, totalRecords, totalPages };
  }

  const result = await query(
    `SELECT ${selectCols}
     FROM test_records tr
     LEFT JOIN encounters e ON tr.encounter_id = e.lab_no
     WHERE ${whereClause}
     ORDER BY tr.encounter_date DESC, tr.time_in DESC`,
    params
  );

  return result.rows;
};

export const updateTestStatus = async (
  testId: number,
  updates: {
    isUrgent?: boolean;
    isReceived?: boolean;
    isResulted?: boolean;
  },
  userId: number
) => {
  const fields = [];
  const values = [];
  let paramCount = 1;

  if (updates.isUrgent !== undefined) {
    fields.push(`is_urgent = $${paramCount++}`);
    values.push(updates.isUrgent);
  }

  if (updates.isReceived !== undefined) {
    fields.push(`is_received = $${paramCount++}`);
    values.push(updates.isReceived);
    if (updates.isReceived) {
      fields.push(`time_received = CURRENT_TIMESTAMP`);
      fields.push(`received_by_id = $${paramCount++}`);
      values.push(userId);
    }
  }

  if (updates.isResulted !== undefined) {
    fields.push(`is_resulted = $${paramCount++}`);
    values.push(updates.isResulted);
    if (updates.isResulted) {
      fields.push(`time_out = CURRENT_TIMESTAMP`);
      fields.push(`resulted_by_id = $${paramCount++}`);
      values.push(userId);
    }
  }

  fields.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(testId);
  const whereParam = paramCount + 1;

  const result = await query(
    `UPDATE test_records 
     SET ${fields.join(', ')} 
     WHERE id = $${whereParam} 
     RETURNING *`,
    values
  );

  // Log audit
  await query(
    `INSERT INTO audit_log (user_id, action, table_name, record_id, new_values) 
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, 'UPDATE_TEST_STATUS', 'test_records', testId, JSON.stringify(updates)]
  );

  // Emit socket event
  emitToReception('test-updated', result.rows[0]);

  return result.rows[0];
};

export const cancelTest = async (
  testId: number,
  reason: string,
  userId: number
) => {
  return await transaction(async (client) => {
    // Get test details
    const testResult = await client.query(
      'SELECT * FROM test_records WHERE id = $1',
      [testId]
    );

    if (testResult.rows.length === 0) {
      throw new Error('Test not found');
    }

    const test = testResult.rows[0];

    // Update test as cancelled
    await client.query(
      `UPDATE test_records 
       SET is_cancelled = true, 
           cancellation_reason = $1, 
           cancelled_at = CURRENT_TIMESTAMP, 
           cancelled_by = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [reason, userId, testId]
    );

    // Log cancellation
    await client.query(
      `INSERT INTO test_cancellations (test_record_id, reason, refund_amount, cancelled_by) 
       VALUES ($1, $2, $3, $4)`,
      [testId, reason, test.price_at_test, userId]
    );

    // Log audit
    await client.query(
      `INSERT INTO audit_log (user_id, action, table_name, record_id, new_values) 
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, 'CANCEL_TEST', 'test_records', testId, JSON.stringify({ reason })]
    );

    const updatedTest = await client.query(
      'SELECT * FROM test_records WHERE id = $1',
      [testId]
    );

    // Emit socket event
    emitToReception('test-cancelled', updatedTest.rows[0]);

    return updatedTest.rows[0];
  });
};

export const uncancelTest = async (testId: number, userId: number) => {
  const result = await query(
    `UPDATE test_records 
     SET is_cancelled = false, 
         cancellation_reason = NULL, 
         cancelled_at = NULL, 
         cancelled_by = NULL,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND is_cancelled = true
     RETURNING *`,
    [testId]
  );
  if (result.rows.length === 0) {
    throw new Error('Test not found or not cancelled');
  }
  emitToReception('test-uncancelled', result.rows[0]);
  return result.rows[0];
};

export const bulkUpdateTests = async (
  testIds: number[],
  action: 'urgent' | 'receive' | 'result' | 'cancel',
  userId: number,
  cancelReason?: string
) => {
  if (action === 'cancel') {
    const results = [];
    for (const id of testIds) {
      try {
        const r = await cancelTest(id, cancelReason || 'bulk_cancel', userId);
        results.push(r);
      } catch (e) {
        console.error(`Bulk cancel test ${id} error:`, e);
      }
    }
    return results;
  }

  const updates: any = {};
  switch (action) {
    case 'urgent':
      updates.isUrgent = true;
      break;
    case 'receive':
      updates.isReceived = true;
      break;
    case 'result':
      updates.isResulted = true;
      break;
  }

  const promises = testIds.map(id => updateTestStatus(id, updates, userId));
  const results = await Promise.all(promises);
  return results;
};