import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { sql } from '@zyntel/db';
import type { WorkOrder, ServiceClient } from '@zyntel/db/schema';

const MARGIN = 50;
const PAGE_W = 595;
const PAGE_H = 842;
const CONTENT_W = PAGE_W - MARGIN * 2;
const RIGHT = PAGE_W - MARGIN;
const CYAN = rgb(0, 0.94, 1);
const INK = rgb(0.1, 0.1, 0.1);
const MUTED = rgb(0.42, 0.45, 0.52);
const BORDER = rgb(0.88, 0.88, 0.9);
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
      cur = font.widthOfTextAtSize(w, size) <= maxW ? w : (() => {
        let chunk = w;
        while (chunk.length > 1) {
          let fit = chunk.length;
          while (fit > 0 && font.widthOfTextAtSize(chunk.slice(0, fit), size) > maxW) fit--;
          if (fit === 0) fit = 1;
          lines.push(chunk.slice(0, fit));
          chunk = chunk.slice(fit);
        }
        return chunk;
      })();
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

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
  const fontMono = await doc.embedFont(StandardFonts.Courier);

  const page = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const baseUrl = opts.baseUrl ?? import.meta.env.SITE ?? 'https://admin.zyntel.net';
  let logoBytes = await loadLogo(baseUrl, '/logos/zyntel_full_cyan.png');
  if (!logoBytes) logoBytes = await loadLogo(baseUrl, '/images/logos/zyntel_full_cyan.png');

  if (logoBytes) {
    try {
      const png = await doc.embedPng(logoBytes);
      const scale = Math.min(130 / png.width, 34 / png.height);
      page.drawImage(png, { x: MARGIN, y: y - png.height * scale, width: png.width * scale, height: png.height * scale });
      y -= png.height * scale + 12;
    } catch {
      page.drawText('zyntel', { x: MARGIN, y, size: 18, font: fontMono, color: CYAN });
      y -= 28;
    }
  } else {
    page.drawText('zyntel', { x: MARGIN, y, size: 18, font: fontMono, color: CYAN });
    y -= 28;
  }

  // Horizontal rule
  const hr = (gap = 10) => {
    page.drawRectangle({ x: MARGIN, y: y - 1, width: CONTENT_W, height: 1, color: BORDER });
    y -= gap + 1;
  };

  const text = (t: string, x = MARGIN, size = 10, bold = false, col = INK, lineGap = 5) => {
    const f = bold ? fontBold : font;
    const lines = wrap(t, f, size, RIGHT - x);
    for (const line of lines) {
      page.drawText(line, { x, y, size, font: f, color: col });
      y -= size + lineGap;
    }
  };

  // Header
  page.drawText('WORK ORDER', { x: MARGIN, y, size: 9, font: fontBold, color: MUTED });
  page.drawText(wo.woNumber, { x: RIGHT - fontBold.widthOfTextAtSize(wo.woNumber, 9), y, size: 9, font: fontBold, color: MUTED });
  y -= 16;

  // Title
  const titleLines = wrap(wo.title, fontBold, 18, CONTENT_W);
  for (const line of titleLines) {
    page.drawText(line, { x: MARGIN, y, size: 18, font: fontBold, color: INK });
    y -= 24;
  }
  y -= 4;

  // Meta row: client · product · date
  const issuedStr = wo.createdAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  text(`${client.name} · ${client.productName}`, MARGIN, 10, false, MUTED);
  text(`Issued: ${issuedStr}`, MARGIN, 10, false, MUTED);
  y -= 2;
  hr(14);

  // Status & coverage badges (text-based)
  const statusStr = STATUS_LABEL[wo.status] ?? wo.status;
  const coverageStr = COVERAGE_LABEL[wo.coverage] ?? wo.coverage;
  text(`Status: ${statusStr}`, MARGIN, 10, true);
  text(`Coverage: ${coverageStr}`, MARGIN, 10, false, MUTED);
  if (wo.estimatedCost != null) {
    text(`Estimated cost: ${wo.currency} ${Number(wo.estimatedCost).toLocaleString()}`, MARGIN, 10, false, MUTED);
  }
  y -= 6;
  hr(14);

  // Description
  if (wo.description && wo.description.trim()) {
    text('Description', MARGIN, 11, true);
    y -= 2;
    text(wo.description, MARGIN + 8, 10, false, INK, 5);
    y -= 8;
  }

  // Scope of work
  if (wo.scopeItems && wo.scopeItems.length > 0) {
    text('Scope of Work', MARGIN, 11, true);
    y -= 2;
    for (const item of wo.scopeItems) {
      const bullet = `• ${item}`;
      const lines = wrap(bullet, font, 10, CONTENT_W - 16);
      for (let i = 0; i < lines.length; i++) {
        page.drawText(lines[i], { x: MARGIN + (i === 0 ? 8 : 20), y, size: 10, font, color: INK });
        y -= 15;
      }
    }
    y -= 6;
  }

  // Notes
  if (wo.notes && wo.notes.trim()) {
    text('Notes', MARGIN, 11, true);
    y -= 2;
    text(wo.notes, MARGIN + 8, 10, false, MUTED);
    y -= 8;
  }

  hr(14);

  // Dates section
  if (wo.approvedAt || wo.completedAt) {
    text('Key Dates', MARGIN, 11, true);
    y -= 2;
    if (wo.approvedAt) {
      text(`Approved: ${wo.approvedAt.toLocaleDateString('en-GB')}${wo.approvedBy ? ` by ${wo.approvedBy}` : ''}`, MARGIN + 8, 10, false, MUTED);
    }
    if (wo.completedAt) {
      text(`Completed: ${wo.completedAt.toLocaleDateString('en-GB')}`, MARGIN + 8, 10, false, MUTED);
    }
    y -= 8;
    hr(14);
  }

  // Signature block — always present for physical sign-off
  text('Authorisation', MARGIN, 11, true);
  y -= 8;

  const sigBoxH = 48;
  const sigW = (CONTENT_W - 20) / 2;

  // Box left (client / approver)
  page.drawRectangle({ x: MARGIN, y: y - sigBoxH, width: sigW, height: sigBoxH, borderColor: BORDER, borderWidth: 1, color: rgb(0.98, 0.98, 0.99) });
  page.drawText('Client / Authorised Signatory', { x: MARGIN + 8, y: y - 14, size: 8, font: fontBold, color: MUTED });
  if (wo.approver1Name) {
    page.drawText(wo.approver1Name, { x: MARGIN + 8, y: y - 28, size: 9, font: fontBold, color: INK });
    if (wo.approver1Role) page.drawText(wo.approver1Role, { x: MARGIN + 8, y: y - 39, size: 8, font, color: MUTED });
  } else {
    page.drawText('Name: ___________________________', { x: MARGIN + 8, y: y - 28, size: 8, font, color: MUTED });
    page.drawText('Signature: ___________________________', { x: MARGIN + 8, y: y - 40, size: 8, font, color: MUTED });
  }

  // Box right (Zyntel)
  const rx = MARGIN + sigW + 20;
  page.drawRectangle({ x: rx, y: y - sigBoxH, width: sigW, height: sigBoxH, borderColor: BORDER, borderWidth: 1, color: rgb(0.98, 0.98, 0.99) });
  page.drawText('Zyntel Co. Limited', { x: rx + 8, y: y - 14, size: 8, font: fontBold, color: MUTED });
  if (wo.approver2Name) {
    page.drawText(wo.approver2Name, { x: rx + 8, y: y - 28, size: 9, font: fontBold, color: INK });
    if (wo.approver2Role) page.drawText(wo.approver2Role, { x: rx + 8, y: y - 39, size: 8, font, color: MUTED });
  } else {
    page.drawText('Name: ___________________________', { x: rx + 8, y: y - 28, size: 8, font, color: MUTED });
    page.drawText('Signature: ___________________________', { x: rx + 8, y: y - 40, size: 8, font, color: MUTED });
  }

  y -= sigBoxH + 20;

  // Footer
  page.drawText(COMPANY_FOOTER, { x: MARGIN, y: MARGIN, size: 8, font, color: MUTED });

  return doc.save();
}
