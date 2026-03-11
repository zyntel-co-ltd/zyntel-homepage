/**
 * Patient results progress - public lookup by lab number.
 * Used by /results page (internet-accessible, no auth).
 */
import { query } from '../config/database';

export interface TestStatus {
  test_name: string;
  lab_section: string | null;
  status: 'pending' | 'received' | 'resulted' | 'cancelled';
  time_in: string | null;
  time_out: string | null;
}

export interface ResultsProgress {
  found: boolean;
  tests: TestStatus[];
  summary: {
    total: number;
    pending: number;
    received: number;
    resulted: number;
    cancelled: number;
  };
  /** Friendly message when not found (e.g. purged or invalid) */
  message?: string;
}

const MIN_LAB_NO_LENGTH = 4;

export const getResultsByLabNo = async (labNo: string): Promise<ResultsProgress> => {
  const trimmed = (labNo || '').replace(/\s/g, '').trim();
  if (!trimmed) {
    return { found: false, tests: [], summary: { total: 0, pending: 0, received: 0, resulted: 0, cancelled: 0 }, message: 'Please enter your full lab number from your receipt.' };
  }
  if (trimmed.length < MIN_LAB_NO_LENGTH) {
    return { found: false, tests: [], summary: { total: 0, pending: 0, received: 0, resulted: 0, cancelled: 0 }, message: 'Please enter your complete lab number. Partial numbers cannot be searched.' };
  }

  const result = await query(
    `SELECT test_name, lab_section_at_test, is_received, is_resulted, is_cancelled, time_in, time_out
     FROM test_records
     WHERE encounter_id = $1 OR lab_no = $1
     ORDER BY test_name`,
    [trimmed]
  );

  const rows = result.rows as any[];
  if (rows.length === 0) {
    return {
      found: false,
      tests: [],
      summary: { total: 0, pending: 0, received: 0, resulted: 0, cancelled: 0 },
      message: "We couldn't find this lab number. It may have been archived, or it might be incorrect. Please check your receipt or contact the lab for assistance.",
    };
  }

  const tests: TestStatus[] = rows.map((r) => {
    let status: TestStatus['status'] = 'pending';
    if (r.is_cancelled) status = 'cancelled';
    else if (r.is_resulted) status = 'resulted';
    else if (r.is_received) status = 'received';

    return {
      test_name: r.test_name,
      lab_section: r.lab_section_at_test,
      status,
      time_in: r.time_in,
      time_out: r.time_out,
    };
  });

  const summary = {
    total: tests.length,
    pending: tests.filter((t) => t.status === 'pending').length,
    received: tests.filter((t) => t.status === 'received').length,
    resulted: tests.filter((t) => t.status === 'resulted').length,
    cancelled: tests.filter((t) => t.status === 'cancelled').length,
  };

  return { found: true, tests, summary };
};
