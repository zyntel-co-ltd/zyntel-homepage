/**
 * Trigger CSV download from 2D array.
 */
export function downloadCSV(
  rows: (string | number | null | undefined)[][],
  filename: string = 'export.csv',
  options?: { delimiter?: string }
): void {
  const csv = toCSVString(rows, options);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

/**
 * Generate CSV string from 2D array of values.
 * Headers in first row; subsequent rows are data.
 * Handles commas, quotes, and newlines in values.
 */
export function toCSVString(
  rows: (string | number | null | undefined)[][],
  options?: { delimiter?: string }
): string {
  const delimiter = options?.delimiter ?? ',';
  const escape = (val: string | number | null | undefined): string => {
    const s = val == null ? '' : String(val);
    if (s.includes(delimiter) || s.includes('"') || s.includes('\n') || s.includes('\r')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const line = (row: (string | number | null | undefined)[]) =>
    row.map(escape).join(delimiter);
  return rows.map(line).join('\r\n');
}
