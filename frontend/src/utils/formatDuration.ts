/**
 * Format a duration (in minutes) as human-readable: "X min", "X hrs Y min", or "X days"
 */
export function formatDuration(minutes: number | string | null | undefined): string {
  if (minutes == null || minutes === '' || minutes === 'N/A') return 'N/A';
  const mins = typeof minutes === 'string' ? parseFloat(minutes) : minutes;
  if (isNaN(mins)) return String(minutes);
  if (mins < 1) return '< 1 min';
  if (mins < 60) return `${Math.round(mins)} min`;
  const hours = Math.floor(mins / 60);
  const remainingMins = Math.round(mins % 60);
  if (hours < 24) {
    return remainingMins > 0 ? `${hours} hr ${remainingMins} min` : `${hours} hr`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  if (remainingHours > 0) {
    return `${days} day${days !== 1 ? 's' : ''} ${remainingHours} hr`;
  }
  return `${days} day${days !== 1 ? 's' : ''}`;
}
