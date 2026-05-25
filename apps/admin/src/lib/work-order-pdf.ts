import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { sql } from '@zyntel/db';
import type { WorkOrder, ServiceClient } from '@zyntel/db/schema';
import { loadPdfLogo } from './pdf-logo.ts';

const MARGIN = 50;
const PAGE_W = 595;
const PAGE_H = 842;
const CONTENT_W = PAGE_W - MARGIN * 2;
const RIGHT = PAGE_W - MARGIN;
const INK = rgb(0.1, 0.1, 0.1);
const MUTED = rgb(0.42, 0.45, 0.52);
const BORDER_COL = rgb(0.88, 0.88, 0.9);
const FOOTER_H = 30; // reserved space at page bottom for footer
const FOOTER_Y = MARGIN; // absolute Y of footer line
const SAFE_BOTTOM = FOOTER_Y + FOOTER_H + 8; // content must not go below this

const COMPANY_FOOTER =
  'Zyntel Co. Limited · P.O Box 860954 · zyntel.net · info@zyntel.net · 0786421061';

function wrap(
  text: string,
  font: { widthOfTextAtSize: (t: string, s: number) => number },
  size: number,
  maxW: number,
): string[] {
  if (!text.trim()) return [];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (font.widthOfTextAtSize(test, size) <= maxW) {
      cur = test;
    } else {
      if (cur) lines.push(cur);
      if (font.widthOfTextAtSize(w, size) <= maxW) {
        cur = w;
      } else {
        let chunk = w;
        while (chunk.length > 1) {
          let fit = chunk.length;
          while (fit > 0 && font.widthOfTextAtSize(chunk.slice(0, fit), size) > maxW) fit--;
          if (fit === 0) fit = 1;
          lines.push(chunk.slice(0, fit));
          chunk = chunk.slice(fit);
        }
        cur = chunk;
      }
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

async function getWorkOrderWithClient(id: string): Promise<{ wo: WorkOrder; client: ServiceClient } | null> {
  if (!import.meta.env.DATABASE_URL) return null;
  const rows = await sql`
    SELECT wo.*, sc.name AS sc_name, sc.product_name AS sc_product_name,
           sc.contact_name AS sc_contact_name, sc.contact_email AS sc_contact_email
    FROM work_orders wo
    JOIN service_clients sc ON sc.id = wo.service_client_id
    WHERE wo.id = ${id}
  `;
  const row = rows[0] as Record<string, any> | undefined;
  if (!row) return null;

  const wo: WorkOrder = {
    id: String(row.id),
    serviceClientId: String(row.service_client_id),
    woNumber: String(row.wo_number),
    title: String(row.title),
    description: String(row.description ?? ''),
    scopeItems: (row.scope_items ?? []) as string[],
    estimatedCost: row.estimated_cost != null ? Number(row.estimated_cost) : null,
    currency: String(row.currency ?? 'UGX'),
    coverage: row.coverage as any,
    status: row.status as any,
    approvalStatus: (row.approval_status ?? 'draft') as any,
    approver1Name: row.approver1_name ?? null,
    approver1Role: row.approver1_role ?? null,
    approver1SignedAt: row.approver1_signed_at ? new Date(row.approver1_signed_at) : null,
    approver2Name: row.approver2_name ?? null,
    approver2Role: row.approver2_role ?? null,
    approver2SignedAt: row.approver2_signed_at ? new Date(row.approver2_signed_at) : null,
    approvedBy: row.approved_by ?? null,
    approvedAt: row.approved_at ? new Date(row.approved_at) : null,
    completedAt: row.completed_at ? new Date(row.completed_at) : null,
    notes: row.notes ?? null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };

  const client: ServiceClient = {
    id: String(row.service_client_id),
    name: String(row.sc_name),
    productName: String(row.sc_product_name),
    productType: 'other' as any,
    contactName: String(row.sc_contact_name ?? ''),
    contactEmail: String(row.sc_contact_email ?? ''),
    invoiceClientId: null,
    healthCheckUrl: null,
    apiUrl: null,
    apiKeyHash: null,
    apiKeyEncrypted: null,
    roiLastSyncedAt: null,
    roiLastSyncError: null,
    repoUrl: null,
    sentryUrl: null,
    cronitorUrl: null,
    notes: null,
    createdAt: new Date(),
  };

  return { wo, client };
}

const COVERAGE_LABEL: Record<string, string> = {
  contract_included: 'Included in maintenance contract',
  paid_extra: 'Paid extra (billable)',
  goodwill_free: 'Goodwill / complimentary',
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  approved: 'Approved',
  'in-progress': 'In Progress',
  completed: 'Completed',
  invoiced: 'Invoiced',
};

export async function generateWorkOrderPdf(opts: {
  workOrderId: string;
  baseUrl?: string;
}): Promise<Uint8Array> {
  const result = await getWorkOrderWithClient(opts.workOrderId);
  if (!result) throw new Error('Work order not found');
  const { wo, client } = result;

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const page = doc.addPage([PAGE_W, PAGE_H]);

  // --- Footer (drawn first at absolute position so it's never covered) ---
  page.drawText(COMPANY_FOOTER, { x: MARGIN, y: FOOTER_Y, size: 8, font, color: MUTED });
  page.drawRectangle({ x: MARGIN, y: FOOTER_Y + 11, width: CONTENT_W, height: 0.5, color: BORDER_COL });

  let y = PAGE_H - MARGIN;

  // --- Logo ---
  const logoBytes = await loadPdfLogo(opts.baseUrl);
  if (logoBytes) {
    try {
      const png = await doc.embedPng(logoBytes);
      const scale = Math.min(150 / png.width, 36 / png.height);
      const w = png.width * scale;
      const h = png.height * scale;
      page.drawImage(png, { x: MARGIN, y: y - h, width: w, height: h });
      y -= h + 14;
    } catch {
      page.drawText('Zyntel Co. Limited', { x: MARGIN, y, size: 13, font: fontBold, color: INK });
      y -= 22;
    }
  } else {
    page.drawText('Zyntel Co. Limited', { x: MARGIN, y, size: 13, font: fontBold, color: INK });
    y -= 22;
  }

  // --- Horizontal rule under logo ---
  page.drawRectangle({ x: MARGIN, y: y - 1, width: CONTENT_W, height: 0.5, color: BORDER_COL });
  y -= 12;

  // --- WORK ORDER label + number on same line ---
  page.drawText('WORK ORDER', { x: MARGIN, y, size: 9, font: fontBold, color: MUTED });
  const wnW = fontBold.widthOfTextAtSize(wo.woNumber, 9);
  page.drawText(wo.woNumber, { x: RIGHT - wnW, y, size: 9, font: fontBold, color: MUTED });
  y -= 18;

  // --- Title ---
  const titleLines = wrap(wo.title, fontBold, 18, CONTENT_W);
  for (const line of titleLines) {
    page.drawText(line, { x: MARGIN, y, size: 18, font: fontBold, color: INK });
    y -= 24;
  }
  y -= 4;

  // --- Meta: client / product / issued ---
  const issuedStr = wo.createdAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  page.drawText(`${client.name} · ${client.productName}`, { x: MARGIN, y, size: 10, font, color: MUTED });
  y -= 15;
  page.drawText(`Issued: ${issuedStr}`, { x: MARGIN, y, size: 10, font, color: MUTED });
  y -= 18;

  page.drawRectangle({ x: MARGIN, y: y - 1, width: CONTENT_W, height: 0.5, color: BORDER_COL });
  y -= 14;

  // --- Status / Coverage / Cost row ---
  const statusStr = STATUS_LABEL[wo.status] ?? wo.status;
  const coverageStr = COVERAGE_LABEL[wo.coverage] ?? wo.coverage;

  page.drawText('Status', { x: MARGIN, y, size: 8, font: fontBold, color: MUTED });
  page.drawText('Coverage', { x: MARGIN + 130, y, size: 8, font: fontBold, color: MUTED });
  if (wo.estimatedCost != null) {
    page.drawText('Estimated Cost', { x: MARGIN + 340, y, size: 8, font: fontBold, color: MUTED });
  }
  y -= 14;
  page.drawText(statusStr, { x: MARGIN, y, size: 10, font: fontBold, color: INK });
  for (const line of wrap(coverageStr, font, 10, 195)) {
    page.drawText(line, { x: MARGIN + 130, y, size: 10, font, color: INK });
    y -= 0; // handled below
  }
  if (wo.estimatedCost != null) {
    page.drawText(`${wo.currency} ${Number(wo.estimatedCost).toLocaleString()}`, { x: MARGIN + 340, y, size: 10, font: fontBold, color: INK });
  }
  y -= 18;

  page.drawRectangle({ x: MARGIN, y: y - 1, width: CONTENT_W, height: 0.5, color: BORDER_COL });
  y -= 14;

  // --- Description ---
  if (wo.description && wo.description.trim()) {
    page.drawText('Description', { x: MARGIN, y, size: 10, font: fontBold, color: INK });
    y -= 14;
    for (const line of wrap(wo.description, font, 10, CONTENT_W - 10)) {
      page.drawText(line, { x: MARGIN + 8, y, size: 10, font, color: INK });
      y -= 14;
    }
    y -= 4;
  }

  // --- Scope of Work ---
  if (wo.scopeItems && wo.scopeItems.length > 0) {
    page.drawText('Scope of Work', { x: MARGIN, y, size: 10, font: fontBold, color: INK });
    y -= 14;
    const bulletGlyph = '• ';
    const bulletW = font.widthOfTextAtSize(bulletGlyph, 10);
    const bulletTextX = MARGIN + 8 + bulletW;
    const bulletTextMaxW = CONTENT_W - 8 - bulletW;
    for (const item of wo.scopeItems) {
      const lines = wrap(item, font, 10, bulletTextMaxW);
      for (let i = 0; i < lines.length; i++) {
        if (i === 0) page.drawText(bulletGlyph, { x: MARGIN + 8, y, size: 10, font, color: INK });
        page.drawText(lines[i], { x: bulletTextX, y, size: 10, font, color: INK });
        y -= 14;
      }
    }
    y -= 4;
  }

  // --- Notes ---
  if (wo.notes && wo.notes.trim()) {
    page.drawText('Notes', { x: MARGIN, y, size: 10, font: fontBold, color: INK });
    y -= 14;
    for (const line of wrap(wo.notes, font, 10, CONTENT_W - 10)) {
      page.drawText(line, { x: MARGIN + 8, y, size: 10, font, color: MUTED });
      y -= 14;
    }
    y -= 4;
  }

  // --- Key Dates ---
  if (wo.approvedAt || wo.completedAt) {
    page.drawText('Key Dates', { x: MARGIN, y, size: 10, font: fontBold, color: INK });
    y -= 14;
    if (wo.approvedAt) {
      const by = wo.approvedBy ? ` by ${wo.approvedBy}` : '';
      page.drawText(`Approved: ${wo.approvedAt.toLocaleDateString('en-GB')}${by}`, { x: MARGIN + 8, y, size: 10, font, color: MUTED });
      y -= 14;
    }
    if (wo.completedAt) {
      page.drawText(`Completed: ${wo.completedAt.toLocaleDateString('en-GB')}`, { x: MARGIN + 8, y, size: 10, font, color: MUTED });
      y -= 14;
    }
    y -= 4;
  }

  // --- Signature blocks: 2 rows × 2 columns (4 total, all optional except row 1) ---
  // Calculate how much space we need: 2 rows × (sigBoxH + gap) + section label + hr
  const sigBoxH = 56;
  const sigGap = 12; // gap between columns
  const sigRowGap = 10; // gap between rows
  const sigW = (CONTENT_W - sigGap) / 2;
  const totalSigH = 14 + 10 + (sigBoxH * 2) + sigRowGap + 10; // label + hr + 2 rows + gaps

  // If current y is too close to SAFE_BOTTOM to fit signatures, add a second page
  if (y - totalSigH < SAFE_BOTTOM) {
    const page2 = doc.addPage([PAGE_W, PAGE_H]);
    // Footer on page 2
    page2.drawText(COMPANY_FOOTER, { x: MARGIN, y: FOOTER_Y, size: 8, font, color: MUTED });
    page2.drawRectangle({ x: MARGIN, y: FOOTER_Y + 11, width: CONTENT_W, height: 0.5, color: BORDER_COL });
    y = PAGE_H - MARGIN;
    // Draw signatures on page 2
    drawSignatures(page2, y, sigBoxH, sigW, sigGap, sigRowGap, wo, font, fontBold, INK, MUTED, BORDER_COL, MARGIN, CONTENT_W);
  } else {
    page.drawRectangle({ x: MARGIN, y: y - 1, width: CONTENT_W, height: 0.5, color: BORDER_COL });
    y -= 14;
    drawSignatures(page, y, sigBoxH, sigW, sigGap, sigRowGap, wo, font, fontBold, INK, MUTED, BORDER_COL, MARGIN, CONTENT_W);
  }

  return doc.save();
}

function drawSignatures(
  page: ReturnType<import('pdf-lib').PDFDocument['addPage']>,
  startY: number,
  boxH: number,
  boxW: number,
  colGap: number,
  rowGap: number,
  wo: WorkOrder,
  font: import('pdf-lib').PDFFont,
  fontBold: import('pdf-lib').PDFFont,
  ink: import('pdf-lib').Color,
  muted: import('pdf-lib').Color,
  border: import('pdf-lib').Color,
  margin: number,
  _contentW: number,
): void {
  let y = startY;
  page.drawText('Authorisation', { x: margin, y, size: 10, font: fontBold, color: ink });
  y -= 14;

  const sigLabels: Array<{ name?: string | null; role?: string | null; signedAt?: Date | null }> = [
    { name: wo.approver1Name, role: wo.approver1Role, signedAt: wo.approver1SignedAt },
    { name: wo.approver2Name, role: wo.approver2Role, signedAt: wo.approver2SignedAt },
    { name: null, role: null },
    { name: null, role: null },
  ];

  // Row 1: sigLabels[0] + sigLabels[1]
  // Row 2: sigLabels[2] + sigLabels[3]
  const rows = [[sigLabels[0], sigLabels[1]], [sigLabels[2], sigLabels[3]]];

  for (let r = 0; r < rows.length; r++) {
    const rowY = y;
    const [left, right] = rows[r];

    for (let c = 0; c < 2; c++) {
      const sig = c === 0 ? left : right;
      const bx = margin + c * (boxW + colGap);
      const bg = r === 1 ? rgb(0.985, 0.985, 0.99) : rgb(0.975, 0.975, 0.99);
      page.drawRectangle({ x: bx, y: rowY - boxH, width: boxW, height: boxH, borderColor: border, borderWidth: 1, color: bg });

      if (sig.name) {
        page.drawText(`Name: ${sig.name}`, { x: bx + 8, y: rowY - 16, size: 9, font: fontBold, color: ink });
        if (sig.role) page.drawText(`Designation: ${sig.role}`, { x: bx + 8, y: rowY - 30, size: 8, font, color: muted });
        if (sig.signedAt) page.drawText(`Signed: ${sig.signedAt.toLocaleDateString('en-GB')}`, { x: bx + 8, y: rowY - 42, size: 8, font, color: muted });
      } else {
        const lineColor = r === 1 ? rgb(0.8, 0.8, 0.85) : muted;
        page.drawText('Name: _______________________________', { x: bx + 8, y: rowY - 16, size: 8, font, color: lineColor });
        page.drawText('Designation: _______________________', { x: bx + 8, y: rowY - 30, size: 8, font, color: lineColor });
      }
    }

    y -= boxH + rowGap;
  }
}
