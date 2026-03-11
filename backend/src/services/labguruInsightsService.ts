/**
 * LabGuru Insights - comparison layer for targets.
 * Surfaces LabGuru's raw test count alongside our canonical count.
 * Does not change app logic; adds insight for target comparison.
 */
import { execSync } from 'child_process';
import path from 'path';
import { query } from '../config/database';
import { getPeriodDates, getChartGranularity } from '../utils/dateUtils';
import { getTestsTargetForPeriod } from './testsTargetService';
import moment from 'moment';

export interface LabGuruInsightsResult {
  labguruCount: number;
  ourCount: number;
  target: number;
  labguruDaily: Array<{ date: string; count: number }>;
  ourDaily: Array<{ date: string; count: number }>;
  startDate: string;
  endDate: string;
  gap: number; // labguruCount - ourCount
  granularity?: 'daily' | 'monthly';
  labguruError?: string; // When LabGuru Python/DB fails but our data is available
}

export const getLabGuruInsights = async (params: {
  period?: string;
  startDate?: string;
  endDate?: string;
}): Promise<LabGuruInsightsResult | { error: string }> => {
  let startDate: Date;
  let endDate: Date;

  if (params.period && params.period !== 'custom') {
    const dates = getPeriodDates(params.period);
    startDate = dates.startDate;
    endDate = dates.endDate;
  } else if (params.startDate && params.endDate) {
    startDate = new Date(params.startDate);
    endDate = new Date(params.endDate);
  } else {
    const dates = getPeriodDates('thisMonth');
    startDate = dates.startDate;
    endDate = dates.endDate;
  }

  const startStr = moment(startDate).format('YYYY-MM-DD');
  const endStr = moment(endDate).format('YYYY-MM-DD');

  const granularity = getChartGranularity(params.period);
  // 1. Our count (from test_records) - monthly rollup when > 31 days
  const ourResult = granularity === 'monthly'
    ? await query(
        `SELECT date_trunc('month', encounter_date)::date as date, COUNT(*) as count
         FROM test_records 
         WHERE encounter_date BETWEEN $1 AND $2 AND is_cancelled = false
         GROUP BY date_trunc('month', encounter_date) 
         ORDER BY date_trunc('month', encounter_date)`,
        [startDate, endDate]
      )
    : await query(
        `SELECT encounter_date::date as date, COUNT(*) as count
         FROM test_records 
         WHERE encounter_date BETWEEN $1 AND $2 AND is_cancelled = false
         GROUP BY encounter_date::date 
         ORDER BY encounter_date::date`,
        [startDate, endDate]
      );
  const ourDaily = ourResult.rows.map((r: any) => ({
    date: moment(r.date).format(granularity === 'monthly' ? 'YYYY-MM' : 'YYYY-MM-DD'),
    count: parseInt(r.count),
  }));
  const ourCount = ourDaily.reduce((s, d) => s + d.count, 0);

  // 2. Target
  const target = await getTestsTargetForPeriod(startDate, endDate);

  // 3. LabGuru count (from Kranium.Labrequest via Python)
  let labguruCount = 0;
  let labguruDaily: Array<{ date: string; count: number }> = [];
  try {
    const scriptPath = path.join(__dirname, '../../scripts/data-fetching/get_labguru_counts.py');
    const pythonCmd = (process.env.PYTHON_PATH || (process.platform === 'win32' ? 'py -3.11' : 'python3')).trim();
    const parts = pythonCmd.split(/\s+/);
    const pythonExe = parts[0];
    const pythonArgs = [...parts.slice(1), scriptPath, startStr, endStr];
    const out = execSync(pythonExe, pythonArgs, {
      encoding: 'utf-8',
      timeout: 15000,
      cwd: path.join(__dirname, '../..'),
    });
    const parsed = JSON.parse(out.trim());
    if (parsed.error) {
      return {
        labguruCount: 0,
        labguruDaily: [],
        ourCount,
        target,
        ourDaily,
        granularity,
        startDate: startStr,
        endDate: endStr,
        gap: -ourCount,
        labguruError: parsed.error,
      };
    }
    labguruCount = parsed.labguruCount ?? 0;
    const rawDaily = parsed.daily ?? [];
    if (granularity === 'monthly' && rawDaily.length > 0) {
      const byMonth: Record<string, number> = {};
      rawDaily.forEach((d: { date: string; count: number }) => {
        const monthKey = moment(d.date).format('YYYY-MM');
        byMonth[monthKey] = (byMonth[monthKey] || 0) + (d.count || 0);
      });
      labguruDaily = Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count }));
    } else {
      labguruDaily = rawDaily;
    }
  } catch (err: any) {
    const msg = err?.stderr || err?.message || String(err);
    return {
      labguruCount: 0,
      labguruDaily: [],
      ourCount,
      target,
      ourDaily,
      granularity,
      startDate: startStr,
      endDate: endStr,
      gap: -ourCount,
      labguruError: `LabGuru unavailable: ${msg}`,
    };
  }

  return {
    labguruCount,
    ourCount,
    target,
    labguruDaily,
    ourDaily,
    granularity,
    startDate: startStr,
    endDate: endStr,
    gap: labguruCount - ourCount,
  };
};

export const getLabGuruTestsFull = async (params: {
  period?: string;
  startDate?: string;
  endDate?: string;
}): Promise<{ labguruTests: Array<{ test: string; count: number }>; ourTests: Array<{ test: string; count: number }>; labguruCount: number; ourCount: number; target: number; gap: number; startDate: string; endDate: string } | { error: string }> => {
  let startDate: Date;
  let endDate: Date;

  if (params.period && params.period !== 'custom') {
    const dates = getPeriodDates(params.period);
    startDate = dates.startDate;
    endDate = dates.endDate;
  } else if (params.startDate && params.endDate) {
    startDate = new Date(params.startDate);
    endDate = new Date(params.endDate);
  } else {
    const dates = getPeriodDates('thisMonth');
    startDate = dates.startDate;
    endDate = dates.endDate;
  }

  const startStr = moment(startDate).format('YYYY-MM-DD');
  const endStr = moment(endDate).format('YYYY-MM-DD');

  // 1. Summary counts (LabGuru, Dashboard, Target, Gap) - same source as Tests page
  const insightsResult = await getLabGuruInsights({ period: params.period, startDate: params.startDate, endDate: params.endDate });
  if ('error' in insightsResult && !('ourCount' in insightsResult)) {
    return { error: insightsResult.error };
  }
  const labguruCount = (insightsResult as LabGuruInsightsResult).labguruCount ?? 0;
  const ourCount = (insightsResult as LabGuruInsightsResult).ourCount;
  const target = (insightsResult as LabGuruInsightsResult).target;
  const gap = (insightsResult as LabGuruInsightsResult).gap ?? -ourCount;

  // 2. Our tests from test_records (get first so we can return partial on LabGuru failure)
  const ourResult = await query(
    `SELECT test_name, COUNT(*) as count
     FROM test_records
     WHERE encounter_date BETWEEN $1 AND $2 AND is_cancelled = false
     GROUP BY test_name
     ORDER BY count DESC`,
    [startDate, endDate]
  );
  const ourTests = ourResult.rows.map((r: any) => ({
    test: (r.test_name || '').trim(),
    count: parseInt(r.count),
  })).filter((t) => t.test);

  // 3. LabGuru tests from LabGuruV3 analyzer tables (aggregated by test name)
  let labguruTests: Array<{ test: string; count: number }> = [];
  try {
    const scriptPath = path.join(__dirname, '../../scripts/data-fetching/get_labguru_tests.py');
    const pythonCmd = (process.env.PYTHON_PATH || (process.platform === 'win32' ? 'py -3.11' : 'python3')).trim();
    const parts = pythonCmd.split(/\s+/);
    const pythonExe = parts[0];
    const pythonArgs = [...parts.slice(1), scriptPath, startStr, endStr];
    const out = execSync(pythonExe, pythonArgs, {
      encoding: 'utf-8',
      timeout: 30000,
      cwd: path.join(__dirname, '../..'),
    });
    const parsed = JSON.parse(out.trim());
    if (!parsed.error) {
      labguruTests = parsed.tests || [];
    }
  } catch (_err) {
    // LabGuru unavailable - return our data only
  }

  return { labguruTests, ourTests, labguruCount, ourCount, target, gap, startDate: startStr, endDate: endStr };
};
