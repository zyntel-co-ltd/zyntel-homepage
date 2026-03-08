/**
 * Auto-refresh intervals (ms).
 * Charts: less frequent (data changes slowly).
 * Tables: more frequent (reception, LRIDS need near real-time).
 */
export const CHART_REFRESH_MS = 120000;  // 2 min
export const TABLE_REFRESH_MS = 30000;   // 30 sec
