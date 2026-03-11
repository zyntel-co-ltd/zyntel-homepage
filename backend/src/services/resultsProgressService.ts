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

export interface PatientProgress {
  lab_number: string;
  time_in: string | null;
  request_time_expected: string | null;
  request_time_out: string | null;
  progress: 'Completed' | 'Delayed' | 'Pending' | 'No ETA';
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
  /** Patient-level progress (like LRIDS) - one row per lab number */
  patient?: PatientProgress;
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

  let patient: ResultsProgress['patient'] | undefined;
  try {
    const patientResult = await query(
      `SELECT lab_number, time_in, request_time_expected, request_time_out
       FROM patients WHERE lab_number = $1`,
      [trimmed]
    );
    const p = patientResult.rows[0] as any;
    if (p) {
      const now = new Date();
      const timeOut = p.request_time_out ? new Date(p.request_time_out) : null;
      const timeExpected = p.request_time_expected ? new Date(p.request_time_expected) : null;
      const hasTimeOut = timeOut && !isNaN(timeOut.getTime()) && timeOut <= now;
      const hasTimeExpected = timeExpected && !isNaN(timeExpected.getTime());
      const isExpectedPast = hasTimeExpected && timeExpected! <= now;
      let progress: PatientProgress['progress'] = 'No ETA';
      if (hasTimeOut) progress = 'Completed';
      else if (hasTimeExpected && isExpectedPast) progress = 'Delayed';
      else if (hasTimeExpected) progress = 'Pending';
      patient = {
        lab_number: p.lab_number,
        time_in: p.time_in,
        request_time_expected: p.request_time_expected,
        request_time_out: p.request_time_out,
        progress,
      };
    }
  } catch (_) {
    // patients table may not exist or lab_number not in patients
  }

  if (!patient && rows.length > 0) {
    const r0 = rows[0] as any;
    const allResulted = rows.every((r: any) => r.is_resulted);
    const anyResulted = rows.some((r: any) => r.is_resulted);
    const timeOuts = rows
      .map((r: any) => r.time_out ? new Date(r.time_out) : null)
      .filter((d): d is Date => d !== null);
    const latestTimeOut = timeOuts.sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
    let progress: PatientProgress['progress'] = 'Pending';
    if (allResulted && latestTimeOut) progress = 'Completed';
    else if (!anyResulted) progress = 'Pending';
    else progress = 'Pending';
    patient = {
      lab_number: trimmed,
      time_in: r0.time_in,
      request_time_expected: null,
      request_time_out: latestTimeOut ? latestTimeOut.toISOString() : null,
      progress,
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

  return { found: true, tests, summary, patient };
};
