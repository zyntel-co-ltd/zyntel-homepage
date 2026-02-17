import { query } from '../config/database';

export interface TestForLab {
  id: number;
  test_name: string;
  lab_section_at_test: string | null;
  is_urgent: boolean;
  is_received: boolean;
  is_resulted: boolean;
  is_cancelled: boolean;
  time_in: string | null;
  time_out: string | null;
  actual_tat: number | null;
}

export const getTestsByLabNo = async (labNo: string): Promise<TestForLab[]> => {
  const result = await query(
    `SELECT id, test_name, lab_section_at_test, is_urgent, is_received, is_resulted, is_cancelled, time_in, time_out, actual_tat
     FROM test_records
     WHERE encounter_id = $1 OR lab_no = $1
     ORDER BY test_name`,
    [labNo]
  );
  return result.rows as TestForLab[];
};
