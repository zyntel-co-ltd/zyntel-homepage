/**
 * Lab sections and TAT values from meta.csv - used for Meta table edit form
 */
export const LAB_SECTIONS = [
  'CHEMISTRY',
  'HEAMATOLOGY',
  'MICROBIOLOGY',
  'REFERRAL',
  'SEROLOGY',
  'N/A',
] as const;

export const TAT_OPTIONS = [
  30, 45, 60, 90, 240, 1440, 4320, 7200, 17280,
] as const;

export const formatTimeWithAMPM = (date: Date | string | null | undefined): string => {
  if (!date) return 'N/A';
  let d: Date;
  if (typeof date === 'string') {
    if (/^\d{1,2}:\d{2}$/.test(date)) {
      d = new Date(`2000-01-01T${date.padStart(5, '0')}`);
    } else {
      d = new Date(date);
    }
  } else {
    d = date;
  }
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
};

export const formatDateTimeWithAMPM = (date: Date | string | null | undefined): string => {
  if (!date) return 'N/A';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleString('en-US', {
    month: '2-digit', day: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  });
};
