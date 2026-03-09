import { query } from '../config/database';
import { exportMetadataToCSV } from './metadataService';

export const getUnmatchedTests = async () => {
  const result = await query(
    `SELECT * FROM unmatched_tests 
     WHERE is_resolved = false 
     ORDER BY occurrence_count DESC, last_seen DESC`
  );

  return result.rows;
};

export const resolveUnmatchedTest = async (id: number, userId: number) => {
  await query(
    `UPDATE unmatched_tests 
     SET is_resolved = true, 
         resolved_at = CURRENT_TIMESTAMP, 
         resolved_by = $1 
     WHERE id = $2`,
    [userId, id]
  );

  return { message: 'Unmatched test resolved' };
};

export const addUnmatchedToMeta = async (
  id: number,
  labSection: string,
  tat: number,
  price: number,
  userId: number,
  opts?: { skipExport?: boolean }
) => {
  const testResult = await query(
    'SELECT test_name FROM unmatched_tests WHERE id = $1 AND is_resolved = false',
    [id]
  );
  if (testResult.rows.length === 0) {
    throw new Error('Unmatched test not found or already resolved');
  }
  const { test_name } = testResult.rows[0];

  await query(
    `INSERT INTO test_metadata (test_name, current_price, current_tat, current_lab_section, is_default)
     VALUES ($1, $2, $3, $4, false)
     ON CONFLICT (test_name) DO UPDATE SET
       current_price = EXCLUDED.current_price,
       current_tat = EXCLUDED.current_tat,
       current_lab_section = EXCLUDED.current_lab_section,
       is_default = false,
       updated_at = CURRENT_TIMESTAMP`,
    [test_name, price, tat, labSection]
  );

  await query(
    `UPDATE unmatched_tests 
     SET is_resolved = true, resolved_at = CURRENT_TIMESTAMP, resolved_by = $1 
     WHERE id = $2`,
    [userId, id]
  );

  if (!opts?.skipExport) {
    await exportMetadataToCSV();
  }
  return { message: 'Added to Meta table', testName: test_name };
};

export const addMultipleUnmatchedToMeta = async (
  items: { id: number; labSection: string; tat: number; price: number }[],
  userId: number
) => {
  const results = [];
  let anySuccess = false;
  for (const item of items) {
    try {
      const r = await addUnmatchedToMeta(item.id, item.labSection, item.tat, item.price, userId, { skipExport: true });
      results.push({ id: item.id, success: true, ...r });
      anySuccess = true;
    } catch (err: any) {
      results.push({ id: item.id, success: false, error: err.message });
    }
  }
  if (anySuccess) {
    await exportMetadataToCSV();
  }
  return results;
};

export const getDashboardStats = async () => {
  // Total encounters (from patients table - main data source)
  const patientsResult = await query(
    'SELECT COUNT(*) as count FROM patients'
  );
  const totalEncounters = parseInt(patientsResult.rows[0].count as string);

  // Total test records if populated (for backward compat)
  const testsResult = await query(
    'SELECT COUNT(*) as count FROM test_records WHERE is_cancelled = false'
  );
  const totalTestRecords = parseInt(testsResult.rows[0].count as string);

  // Total users
  const usersResult = await query(
    'SELECT COUNT(*) as count FROM users WHERE is_active = true'
  );

  // Unmatched tests
  const unmatchedResult = await query(
    'SELECT COUNT(*) as count FROM unmatched_tests WHERE is_resolved = false'
  );

  // Recent cancellations
  const cancellationsResult = await query(
    `SELECT COUNT(*) as count FROM test_cancellations 
     WHERE cancelled_at >= NOW() - INTERVAL '7 days'`
  );

  return {
    totalTests: totalTestRecords > 0 ? totalTestRecords : totalEncounters,
    totalEncounters,
    totalUsers: parseInt(usersResult.rows[0].count as string),
    unmatchedTests: parseInt(unmatchedResult.rows[0].count as string),
    recentCancellations: parseInt(cancellationsResult.rows[0].count as string),
  };
};

export const getCancellationAnalytics = async (filters?: {
  startDate?: string;
  endDate?: string;
  period?: string;
  labSection?: string;
}) => {
  const { getPeriodDates } = await import('../utils/dateUtils');
  let startDate: Date;
  let endDate: Date;

  if (filters?.period && filters.period !== 'custom') {
    const dates = getPeriodDates(filters.period);
    startDate = dates.startDate;
    endDate = dates.endDate;
  } else if (filters?.startDate && filters?.endDate) {
    startDate = new Date(filters.startDate);
    endDate = new Date(filters.endDate);
  } else {
    const dates = getPeriodDates('thisMonth');
    startDate = dates.startDate;
    endDate = dates.endDate;
  }

  const conditions = ['tc.cancelled_at::date >= $1::date', 'tc.cancelled_at::date <= $2::date'];
  const params: any[] = [startDate, endDate];
  let paramCount = 3;

  if (filters?.labSection && filters.labSection !== 'all') {
    conditions.push(`LOWER(tr.lab_section_at_test) = LOWER($${paramCount++})`);
    params.push(filters.labSection);
  }

  const whereClause = conditions.join(' AND ');
  const result = await query(
    `SELECT tc.reason, COUNT(*) as count
     FROM test_cancellations tc
     JOIN test_records tr ON tr.id = tc.test_record_id
     WHERE ${whereClause}
     GROUP BY tc.reason
     ORDER BY count DESC`,
    params
  );

  return result.rows.map((row) => ({
    reason: row.reason,
    count: parseInt(row.count),
  }));
};