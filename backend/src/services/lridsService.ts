import { query } from '../config/database';
import moment from 'moment';

/**
 * LRIDS service - uses patients table (same as progress).
 * Returns lab number, time in, and progress (from request_time_expected / request_time_out).
 */
export const getLRIDSData = async (limit: number = 100) => {
  const result = await query(
    `SELECT
       lab_number,
       time_in,
       request_time_expected,
       request_time_out
     FROM patients
     WHERE date >= CURRENT_DATE - INTERVAL '7 days'
     ORDER BY date DESC, time_in DESC NULLS LAST
     LIMIT $1`,
    [limit]
  );

  const now = new Date();

  const rows = result.rows.map((row: any) => {
    const timeExpected = row.request_time_expected ? new Date(row.request_time_expected) : null;
    const timeOut = row.request_time_out ? new Date(row.request_time_out) : null;

    let progress = 'No ETA';
    if (timeOut && !isNaN(timeOut.getTime()) && timeOut <= now) {
      progress = 'Completed';
    } else if (timeExpected && !isNaN(timeExpected.getTime())) {
      if (timeExpected <= now) {
        progress = 'Delayed';
      } else {
        const mins = Math.floor((timeExpected.getTime() - now.getTime()) / 60000);
        if (mins <= 10 && mins > 0) progress = `${mins} min(s) remaining`;
        else if (mins > 0) progress = `${mins} min(s) remaining`;
        else progress = 'Due now';
      }
    }

    return {
      lab_number: row.lab_number,
      labNo: row.lab_number,
      time_in: row.time_in,
      timeIn: row.time_in ? moment(row.time_in).format('h:mm A') : 'N/A',
      progress,
    };
  });

  return rows;
};
