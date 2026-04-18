import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { getServiceClientById, getMaintenanceLogs, getWorkOrders } from './maintenance.ts';

const MARGIN = 50;
const CONTENT_WIDTH = 595 - MARGIN * 2;
const CYAN = rgb(0, 0.94, 1);

async function loadLogo(baseUrl: string, path: string): Promise<Uint8Array | null> {
  try {
    const url = `${baseUrl.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    return new Uint8Array(await res.arrayBuffer());
  } catch {
    return null;
  }
}

function truncate(
  text: string,
  font: { widthOfTextAtSize: (t: string, s: number) => number },
  size: number,
  maxWidth: number
): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let s = text;
  while (s.length > 0 && font.widthOfTextAtSize(s + '...', size) > maxWidth) s = s.slice(0, -1);
  return s ? s + '...' : '...';
}

function wrapText(
  text: string,
  font: { widthOfTextAtSize: (t: string, s: number) => number },
  size: number,
  maxWidth: number
): string[] {
  if (!text.trim()) return [];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const w of words) {
    const test = current ? `${current} ${w}` : w;
    if (font.widthOfTextAtSize(test, size) <= maxWidth) {
      current = test;
    } else {
      if (current) lines.push(current);
      current = font.widthOfTextAtSize(w, size) <= maxWidth ? w : (() => {
        let chunk = w;
        while (chunk.length > 0) {
          let fit = chunk.length;
          while (fit > 0 && font.widthOfTextAtSize(chunk.slice(0, fit), size) > maxWidth) fit--;
          if (fit === 0) fit = 1;
          lines.push(chunk.slice(0, fit));
          chunk = chunk.slice(fit);
        }
        return '';
      })();
    }
  }
  if (current) lines.push(current);
  return lines;
}

export async function generateMaintenanceReportPdf(opts: {
  serviceClientId: string;
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  year: number;
  baseUrl?: string;
}): Promise<Uint8Array> {
  const client = await getServiceClientById(opts.serviceClientId);
  if (!client) throw new Error('Service client not found');

  const qMap: Record<string, [number, number]> = {
    Q1: [0, 2], Q2: [3, 5], Q3: [6, 8], Q4: [9, 11],
  };
  const [qStartMonth, qEndMonth] = qMap[opts.quarter];
  const qStart = new Date(opts.year, qStartMonth, 1);
  const qEnd = new Date(opts.year, qEndMonth + 1, 0);
  const qStartStr = qStart.toISOString().slice(0, 10);
  const qEndStr = qEnd.toISOString().slice(0, 10);

  const [allLogs, allWOs] = await Promise.all([
    getMaintenanceLogs(opts.serviceClientId, { dateFrom: qStartStr, dateTo: qEndStr }),
    getWorkOrders(opts.serviceClientId),
  ]);

  const incidents = allLogs.filter((l) => l.type === 'incident');
  const preventive = allLogs.filter((l) => l.type === 'preventive');
  const support = allLogs.filter((l) => l.type === 'support');
  const closedWOs = allWOs.filter((w) => ['completed', 'invoiced'].includes(w.status));
  const openWOs = allWOs.filter((w) => !['completed', 'invoiced'].includes(w.status));

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontMono = await doc.embedFont(StandardFonts.Courier);

  const addPage = () => {
    const p = doc.addPage([595, 842]);
    return { page: p, y: [p.getHeight() - 50] };
  };

  const { page, y } = addPage();
  const rightEdge = 595 - MARGIN;

  const baseUrl = opts.baseUrl ?? import.meta.env.SITE ?? 'https://zyntel.net';
  let logoBytes = await loadLogo(baseUrl, '/images/logos/zyntel_full_cyan.png');
  if (!logoBytes) logoBytes = await loadLogo(baseUrl, '/logos/zyntel_full_cyan.png');

  if (logoBytes) {
    try {
      const png = await doc.embedPng(logoBytes);
      const scale = Math.min(140 / png.width, 38 / png.height);
      page.drawImage(png, { x: MARGIN, y: y[0] - png.height * scale, width: png.width * scale, height: png.height * scale });
      y[0] -= png.height * scale + 16;
    } catch {
      page.drawText('zyntel', { x: MARGIN, y: y[0], size: 18, font: fontMono, color: CYAN });
      y[0] -= 26;
    }
  } else {
    page.drawText('zyntel', { x: MARGIN, y: y[0], size: 18, font: fontMono, color: CYAN });
    y[0] -= 26;
  }

  const draw = (text: string, x = MARGIN, size = 10, bold = false, col = rgb(0.1, 0.1, 0.1)) => {
    const f = bold ? fontBold : font;
    page.drawText(truncate(text, f, size, rightEdge - x), { x, y: y[0], size, font: f, color: col });
    y[0] -= size + 5;
  };

  const hr = () => {
    page.drawRectangle({ x: MARGIN, y: y[0] - 2, width: CONTENT_WIDTH, height: 1, color: rgb(0.88, 0.88, 0.88) });
    y[0] -= 12;
  };

  draw(`Quarterly Maintenance Report — ${opts.quarter} ${opts.year}`, MARGIN, 18, true);
  draw(`Client: ${client.name} · Product: ${client.productName}`, MARGIN, 10, false, rgb(0.4, 0.4, 0.4));
  draw(`Period: ${qStartStr} to ${qEndStr}`, MARGIN, 10, false, rgb(0.4, 0.4, 0.4));
  draw(`Generated: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`, MARGIN, 10, false, rgb(0.4, 0.4, 0.4));
  y[0] -= 8;
  hr();

  // System availability summary
  draw('1. System Availability Summary', MARGIN, 13, true);
  y[0] -= 4;
  draw(`Total maintenance activities: ${allLogs.length}`, MARGIN + 10);
  draw(`Incidents: ${incidents.length}`, MARGIN + 10);
  draw(`Preventive maintenance activities: ${preventive.length}`, MARGIN + 10);
  draw(`Support requests: ${support.length}`, MARGIN + 10);
  y[0] -= 8;
  hr();

  // Incidents table
  draw('2. Incidents', MARGIN, 13, true);
  y[0] -= 4;
  if (!incidents.length) {
    draw('No incidents this quarter.', MARGIN + 10, 10, false, rgb(0.5, 0.5, 0.5));
  } else {
    const cols = { date: MARGIN, area: MARGIN + 60, summary: MARGIN + 110, action: MARGIN + 270 };
    page.drawText('Date', { x: cols.date, y: y[0], size: 8, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
    page.drawText('Area', { x: cols.area, y: y[0], size: 8, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
    page.drawText('Summary', { x: cols.summary, y: y[0], size: 8, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
    page.drawText('Resolution', { x: cols.action, y: y[0], size: 8, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
    y[0] -= 14;
    for (const inc of incidents) {
      const summaryLines = wrapText(inc.summary, font, 8, 150);
      const actionLines = wrapText(inc.outcome || inc.actionTaken || '—', font, 8, 145);
      const rowHeight = Math.max(summaryLines.length, actionLines.length) * 11;
      page.drawText(inc.logDate, { x: cols.date, y: y[0], size: 8, font, color: rgb(0.2, 0.2, 0.2) });
      page.drawText(truncate(inc.area, font, 8, 45), { x: cols.area, y: y[0], size: 8, font, color: rgb(0.2, 0.2, 0.2) });
      let lineY = y[0];
      for (const line of summaryLines) { page.drawText(line, { x: cols.summary, y: lineY, size: 8, font, color: rgb(0.2, 0.2, 0.2) }); lineY -= 11; }
      lineY = y[0];
      for (const line of actionLines) { page.drawText(line, { x: cols.action, y: lineY, size: 8, font, color: rgb(0.2, 0.2, 0.2) }); lineY -= 11; }
      y[0] -= rowHeight + 4;
    }
  }
  y[0] -= 6;
  hr();

  // Preventive maintenance
  draw('3. Preventive Maintenance', MARGIN, 13, true);
  y[0] -= 4;
  draw(`${preventive.length} preventive maintenance activities performed this quarter.`, MARGIN + 10);
  for (const p of preventive) {
    draw(`${p.logDate} — ${p.area}: ${p.summary}`, MARGIN + 10, 9);
  }
  y[0] -= 6;
  hr();

  // Support activity
  draw('4. Support Activity', MARGIN, 13, true);
  y[0] -= 4;
  draw(`${support.length} support request(s) handled this quarter.`, MARGIN + 10);
  y[0] -= 6;
  hr();

  // Work orders
  draw('5. Work Orders', MARGIN, 13, true);
  y[0] -= 4;
  draw(`Closed: ${closedWOs.length}  ·  Open: ${openWOs.length}`, MARGIN + 10);
  y[0] -= 4;
  for (const wo of [...closedWOs, ...openWOs]) {
    const costStr = wo.estimatedCost ? ` · Est. ${wo.currency} ${Number(wo.estimatedCost).toLocaleString()}` : '';
    draw(`[${wo.status.toUpperCase()}] ${wo.woNumber} — ${wo.title}${costStr}`, MARGIN + 10, 9);
  }
  y[0] -= 6;
  hr();

  // Overall status
  draw('6. Overall Status', MARGIN, 13, true);
  y[0] -= 4;
  const statusText = incidents.length === 0
    ? `${client.productName} operated without incidents this quarter. ${preventive.length} preventive maintenance activities were completed as planned.`
    : `${client.productName} experienced ${incidents.length} incident(s) this quarter, all of which were addressed promptly. ${preventive.length} preventive maintenance activities were also completed.`;
  for (const line of wrapText(statusText, font, 10, CONTENT_WIDTH - 10)) {
    draw(line, MARGIN + 10, 10);
  }
  y[0] -= 16;
  hr();

  // Footer
  page.drawText('Prepared by Zyntel Limited · Kampala, Uganda · zyntel.net', {
    x: MARGIN,
    y: y[0],
    size: 8,
    font,
    color: rgb(0.6, 0.6, 0.6),
  });

  return doc.save();
}
