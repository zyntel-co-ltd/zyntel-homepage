import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont, type RGB } from 'pdf-lib';
import type { ServiceClient } from '@zyntel/db/schema';
import { loadPdfLogo } from './pdf-logo.ts';
import type { ReportInput } from './reports.ts';

const MARGIN = 50;
const PAGE_W = 595;
const PAGE_H = 842;
const CONTENT_W = PAGE_W - MARGIN * 2;
const COMPANY_FOOTER = 'Zyntel Co. Limited · P.O Box 860954 · zyntel.net · info@zyntel.net · 0786421061';

// --- Text utilities ---

function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string[] {
  if (!text.trim()) return [];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      // Force-break words that are too long on their own
      if (font.widthOfTextAtSize(word, size) <= maxWidth) {
        current = word;
      } else {
        let chunk = word;
        while (chunk.length > 0) {
          let fit = chunk.length;
          while (fit > 0 && font.widthOfTextAtSize(chunk.slice(0, fit), size) > maxWidth) fit--;
          if (fit === 0) fit = 1;
          lines.push(chunk.slice(0, fit));
          chunk = chunk.slice(fit);
        }
        current = '';
      }
    }
  }
  if (current) lines.push(current);
  return lines;
}

function truncate(text: string, font: PDFFont, size: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let s = text;
  while (s.length > 0 && font.widthOfTextAtSize(s + '…', size) > maxWidth) s = s.slice(0, -1);
  return s ? s + '…' : '…';
}

// --- Paginated writer ---

class PdfWriter {
  private doc!: PDFDocument;
  private pages: PDFPage[] = [];
  private cur!: PDFPage;
  private y = 0;
  private font!: PDFFont;
  private fontBold!: PDFFont;
  private pageCount = 0;

  async init(doc: PDFDocument) {
    this.doc = doc;
    this.font = await doc.embedFont(StandardFonts.Helvetica);
    this.fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
    this.newPage();
  }

  getFont(bold = false): PDFFont { return bold ? this.fontBold : this.font; }

  newPage() {
    this.cur = this.doc.addPage([PAGE_W, PAGE_H]);
    this.pages.push(this.cur);
    this.y = PAGE_H - MARGIN;
    this.pageCount++;
  }

  ensure(height: number) {
    if (this.y - height < MARGIN + 20) this.newPage();
  }

  gap(n = 8) { this.y -= n; }

  line(
    text: string,
    opts: { bold?: boolean; size?: number; color?: RGB; x?: number; maxWidth?: number } = {},
  ) {
    const size = opts.size ?? 10;
    const f = this.getFont(opts.bold);
    const x = opts.x ?? MARGIN;
    const mw = opts.maxWidth ?? (CONTENT_W - (x - MARGIN));
    const wrapped = wrapText(text, f, size, mw);
    for (const l of wrapped) {
      this.ensure(size + 4);
      this.cur.drawText(l, { x, y: this.y, size, font: f, color: opts.color ?? rgb(0.1, 0.1, 0.1) });
      this.y -= size + 4;
    }
  }

  rule(color = rgb(0.88, 0.88, 0.88)) {
    this.ensure(12);
    this.cur.drawRectangle({ x: MARGIN, y: this.y - 2, width: CONTENT_W, height: 1, color });
    this.y -= 14;
  }

  section(title: string) {
    this.gap(6);
    this.ensure(20);
    this.line(title, { bold: true, size: 12 });
    this.gap(4);
  }

  tableRow(cols: Array<{ text: string; x: number; width: number }>, bold = false, rowColor?: RGB) {
    const f = this.getFont(bold);
    const size = 8;
    // measure max height across all cells
    let maxLines = 1;
    for (const col of cols) {
      const wrapped = wrapText(col.text, f, size, col.width - 4);
      if (wrapped.length > maxLines) maxLines = wrapped.length;
    }
    const rowH = maxLines * (size + 3) + 4;
    this.ensure(rowH + 2);
    if (rowColor) {
      this.cur.drawRectangle({ x: MARGIN, y: this.y - rowH + 2, width: CONTENT_W, height: rowH, color: rowColor });
    }
    for (const col of cols) {
      const wrapped = wrapText(col.text, f, size, col.width - 4);
      let lineY = this.y;
      for (const l of wrapped) {
        this.cur.drawText(l, { x: col.x + 2, y: lineY, size, font: f, color: rgb(0.1, 0.1, 0.1) });
        lineY -= size + 3;
      }
    }
    this.y -= rowH + 2;
  }

  pageFooter(text: string) {
    for (const p of this.pages) {
      p.drawText(text, {
        x: MARGIN, y: MARGIN - 14,
        size: 7, font: this.font, color: rgb(0.6, 0.6, 0.6),
      });
    }
  }
}

// --- Main export ---

export async function generateClientSummaryPdf(opts: {
  client: ServiceClient;
  sourceData: ReportInput;
  baseUrl?: string;
}): Promise<Uint8Array> {
  const { client, sourceData: data } = opts;

  const doc = await PDFDocument.create();
  const w = new PdfWriter();
  await w.init(doc);

  const baseUrl = opts.baseUrl ?? import.meta.env.SITE_URL ?? import.meta.env.SITE ?? 'https://zyntel.net';
  const logoBytes = await loadPdfLogo(baseUrl).catch(() => null);

  const covLabel: Record<string, string> = {
    contract_included: 'Contract', paid_extra: 'Billable', goodwill_free: 'Complimentary',
  };

  // ── Cover / header ─────────────────────────────────────────────────────────

  if (logoBytes) {
    try {
      const png = await doc.embedPng(logoBytes);
      const scale = Math.min(130 / png.width, 32 / png.height);
      w['cur'].drawImage(png, {
        x: MARGIN, y: w['y'] - png.height * scale,
        width: png.width * scale, height: png.height * scale,
      });
      w['y'] -= png.height * scale + 16;
    } catch {
      w.line('Zyntel Co. Limited', { bold: true, size: 13 });
    }
  } else {
    w.line('Zyntel Co. Limited', { bold: true, size: 13 });
  }

  w.gap(4);
  w.line(`${data.quarter} ${data.year} Activity Summary${data.isCurrentQuarter ? ' — In Progress' : ''}`, { bold: true, size: 18 });
  w.gap(4);
  w.line(`${client.name}  ·  ${client.productName}`, { size: 10, color: rgb(0.4, 0.4, 0.4) });
  w.line(
    `Period: ${data.periodStart} to ${data.dataCursorDate}` +
    (data.isCurrentQuarter ? '  (quarter still in progress)' : ''),
    { size: 9, color: rgb(0.5, 0.5, 0.5) },
  );
  w.line(
    `Prepared: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`,
    { size: 9, color: rgb(0.5, 0.5, 0.5) },
  );
  w.gap(8);
  w.rule(rgb(0.2, 0.2, 0.2));

  // ── System Health ──────────────────────────────────────────────────────────

  w.section('System Health');
  const healthRows: Array<[string, string | number]> = [
    ['Incidents', data.incidents.length],
    ['Preventive maintenance checks', data.preventive.length],
    ['Support requests handled', data.support.length],
    ['Work orders completed', data.closedWOs.length],
    ['Work orders in progress', data.openWOs.length],
  ];
  if (data.commits && data.commits.length) healthRows.push(['Code commits delivered', data.commits.length]);
  if (data.sentryIssues && data.sentryIssues.length) healthRows.push(['Sentry errors tracked', data.sentryIssues.length]);

  const col1 = MARGIN;
  const col2 = MARGIN + 260;
  w.tableRow(
    [{ text: 'Category', x: col1, width: 240 }, { text: 'Count', x: col2, width: 80 }],
    true, rgb(0.93, 0.93, 0.95),
  );
  for (const [label, val] of healthRows) {
    w.tableRow([
      { text: String(label), x: col1, width: 240 },
      { text: String(val), x: col2, width: 80 },
    ]);
  }
  w.gap(10);
  w.rule();

  // ── Key Metrics ────────────────────────────────────────────────────────────

  if (data.roiSnapshots && data.roiSnapshots.length) {
    w.section('Key Metrics');
    const grouped: Record<string, Array<{ value: number; date: string }>> = {};
    for (const s of data.roiSnapshots) {
      if (!grouped[s.metricKey]) grouped[s.metricKey] = [];
      grouped[s.metricKey].push({ value: s.metricValue, date: s.snapshotDate });
    }
    const mCol1 = MARGIN;
    const mCol2 = MARGIN + 200;
    const mCol3 = MARGIN + 310;
    w.tableRow([
      { text: 'Metric', x: mCol1, width: 200 },
      { text: 'Latest Value', x: mCol2, width: 110 },
      { text: 'As of', x: mCol3, width: 120 },
    ], true, rgb(0.93, 0.93, 0.95));
    for (const [key, vals] of Object.entries(grouped)) {
      const sorted = [...vals].sort((a, b) => a.date.localeCompare(b.date));
      const latest = sorted[sorted.length - 1];
      w.tableRow([
        { text: key, x: mCol1, width: 200 },
        { text: latest.value.toLocaleString(), x: mCol2, width: 110 },
        { text: latest.date, x: mCol3, width: 120 },
      ]);
    }
    w.gap(10);
    w.rule();
  }

  // ── Incidents ──────────────────────────────────────────────────────────────

  w.section('Incidents');
  if (!data.incidents.length) {
    w.line('No incidents this period — system operated without disruption.', {
      size: 9, color: rgb(0.35, 0.55, 0.35),
    });
  } else {
    const iCol1 = MARGIN;
    const iCol2 = MARGIN + 70;
    const iCol3 = MARGIN + 130;
    const iCol4 = MARGIN + 290;
    w.tableRow([
      { text: 'Date', x: iCol1, width: 70 },
      { text: 'Area', x: iCol2, width: 60 },
      { text: 'Summary', x: iCol3, width: 160 },
      { text: 'Resolution', x: iCol4, width: 145 },
    ], true, rgb(0.93, 0.93, 0.95));
    for (const inc of data.incidents) {
      const res = inc.outcome || inc.actionTaken || '—';
      w.tableRow([
        { text: inc.logDate, x: iCol1, width: 70 },
        { text: truncate(inc.area, w.getFont(), 8, 56), x: iCol2, width: 60 },
        { text: inc.summary, x: iCol3, width: 160 },
        { text: res, x: iCol4, width: 145 },
      ]);
    }
  }
  w.gap(10);
  w.rule();

  // ── Completed Work Orders ──────────────────────────────────────────────────

  if (data.closedWOs.length) {
    w.section('Completed Work Orders');
    const wCol1 = MARGIN;
    const wCol2 = MARGIN + 70;
    const wCol3 = MARGIN + 270;
    const wCol4 = MARGIN + 370;
    w.tableRow([
      { text: 'WO #', x: wCol1, width: 70 },
      { text: 'Title', x: wCol2, width: 200 },
      { text: 'Coverage', x: wCol3, width: 100 },
      { text: 'Est. Cost', x: wCol4, width: 65 },
    ], true, rgb(0.93, 0.93, 0.95));
    for (const wo of data.closedWOs) {
      const costStr = wo.estimatedCost ? `${wo.currency} ${Number(wo.estimatedCost).toLocaleString()}` : '—';
      w.tableRow([
        { text: wo.woNumber, x: wCol1, width: 70 },
        { text: wo.title, x: wCol2, width: 200 },
        { text: covLabel[wo.coverage] ?? wo.coverage, x: wCol3, width: 100 },
        { text: costStr, x: wCol4, width: 65 },
      ]);
    }
    w.gap(10);
    w.rule();
  }

  // ── Open Work Orders ───────────────────────────────────────────────────────

  if (data.openWOs.length) {
    w.section('Work In Progress');
    for (const wo of data.openWOs) {
      w.line(`${wo.woNumber} — ${wo.title}  [${wo.status}]`, { size: 9, x: MARGIN + 10 });
    }
    w.gap(10);
    w.rule();
  }

  // ── Development Activity ───────────────────────────────────────────────────

  if (data.commits && data.commits.length) {
    w.section('Development Activity');
    w.line(
      `${data.commits.length} code update${data.commits.length === 1 ? '' : 's'} delivered to ${client.productName} this period.`,
      { size: 9 },
    );
    w.gap(4);

    const dCol1 = MARGIN;
    const dCol2 = MARGIN + 55;
    w.tableRow([
      { text: 'Date', x: dCol1, width: 55 },
      { text: 'Change', x: dCol2, width: CONTENT_W - 55 },
    ], true, rgb(0.93, 0.93, 0.95));
    for (const c of data.commits.slice(0, 40)) {
      w.tableRow([
        { text: c.date, x: dCol1, width: 55 },
        { text: c.message, x: dCol2, width: CONTENT_W - 55 },
      ]);
    }
    if (data.commits.length > 40) {
      w.gap(4);
      w.line(`…and ${data.commits.length - 40} more commits. See the full report for the complete log.`, {
        size: 8, color: rgb(0.5, 0.5, 0.5),
      });
    }
    w.gap(10);
    w.rule();
  }

  // ── Footer on all pages ────────────────────────────────────────────────────
  w.pageFooter(COMPANY_FOOTER);

  return doc.save();
}

// Legacy wrapper — keeps the old API working for any callers still using it.
// Loads data fresh and delegates to generateClientSummaryPdf.
export async function generateMaintenanceReportPdf(opts: {
  serviceClientId: string;
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  year: number;
  baseUrl?: string;
}): Promise<Uint8Array> {
  const { getServiceClientById, getMaintenanceLogs, getWorkOrders } = await import('./maintenance.ts');
  const { fetchCommitsForPeriod } = await import('./github.ts');

  const client = await getServiceClientById(opts.serviceClientId);
  if (!client) throw new Error('Service client not found');

  const qMap: Record<string, [number, number]> = {
    Q1: [0, 2], Q2: [3, 5], Q3: [6, 8], Q4: [9, 11],
  };
  const [qStartMonth, qEndMonth] = qMap[opts.quarter];
  const qStart = new Date(opts.year, qStartMonth, 1);
  const qEnd = new Date(opts.year, qEndMonth + 1, 0);
  const periodStart = qStart.toISOString().slice(0, 10);
  const periodEnd = qEnd.toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  const dataCursorDate = today < periodEnd ? today : periodEnd;
  const isCurrentQuarter = today <= periodEnd && today >= periodStart;

  const githubToken = import.meta.env.GITHUB_TOKEN as string | undefined;

  const [allLogs, allWOs, commits] = await Promise.all([
    getMaintenanceLogs(opts.serviceClientId, { dateFrom: periodStart, dateTo: dataCursorDate }),
    getWorkOrders(opts.serviceClientId),
    client.repoUrl
      ? fetchCommitsForPeriod(client.repoUrl, periodStart, dataCursorDate, githubToken)
      : Promise.resolve([]),
  ]);

  const sourceData: ReportInput = {
    clientName: client.name,
    productName: client.productName,
    quarter: opts.quarter,
    year: opts.year,
    periodStart,
    periodEnd,
    dataCursorDate,
    isCurrentQuarter,
    incidents: allLogs.filter((l) => l.type === 'incident').map((i) => ({
      logDate: i.logDate, area: i.area, summary: i.summary,
      actionTaken: i.actionTaken || undefined, outcome: i.outcome || undefined,
    })),
    preventive: allLogs.filter((l) => l.type === 'preventive').map((p) => ({
      logDate: p.logDate, area: p.area, summary: p.summary,
    })),
    support: allLogs.filter((l) => l.type === 'support').map((s) => ({
      logDate: s.logDate, area: s.area, summary: s.summary,
    })),
    closedWOs: allWOs.filter((w) => ['completed', 'invoiced'].includes(w.status)).map((w) => ({
      woNumber: w.woNumber, title: w.title, coverage: w.coverage,
      estimatedCost: w.estimatedCost, currency: w.currency,
    })),
    openWOs: allWOs.filter((w) => !['completed', 'invoiced'].includes(w.status)).map((w) => ({
      woNumber: w.woNumber, title: w.title, coverage: w.coverage, status: w.status,
    })),
    commits: commits.length ? commits : undefined,
  };

  return generateClientSummaryPdf({ client, sourceData, baseUrl: opts.baseUrl });
}
