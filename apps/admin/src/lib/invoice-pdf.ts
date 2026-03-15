import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { Invoice, PaymentRecord, PaymentAccount } from '@zyntel/db';

const formatMoney = (n: number, currency: string): string =>
  currency ? `${currency} ${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : String(Number(n).toLocaleString('en-US', { minimumFractionDigits: 2 }));

const CYAN = rgb(0, 0.94, 1);

async function loadLogo(baseUrl: string, path: string): Promise<Uint8Array | null> {
  try {
    const url = `${baseUrl.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    return new Uint8Array(buf);
  } catch {
    return null;
  }
}

export interface PdfOptions {
  baseUrl?: string;
  paymentAccount?: PaymentAccount | null;
}

const MARGIN = 50;
const CONTENT_WIDTH = 595 - MARGIN * 2;

function truncate(text: string, font: { widthOfTextAtSize: (t: string, s: number) => number }, size: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let s = text;
  while (s.length > 0 && font.widthOfTextAtSize(s + '...', size) > maxWidth) s = s.slice(0, -1);
  return s ? s + '...' : '...';
}

function wrapText(text: string, font: { widthOfTextAtSize: (t: string, s: number) => number }, size: number, maxWidth: number): string[] {
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
      if (font.widthOfTextAtSize(w, size) <= maxWidth) {
        current = w;
      } else {
        let chunk = w;
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

export async function generateInvoicePdf(invoice: Invoice, options: PdfOptions = {}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontMono = await doc.embedFont(StandardFonts.Courier);
  const page = doc.addPage([595, 842]);
  const { width, height } = page.getSize();
  const rightEdge = width - MARGIN;
  let y = height - 40;

  const baseUrl = options.baseUrl ?? import.meta.env.SITE ?? 'https://zyntel.net';
  let logoBytes = await loadLogo(baseUrl, '/images/logos/zyntel_full_cyan.png');
  if (!logoBytes) logoBytes = await loadLogo(baseUrl, '/logos/zyntel_full_cyan.png');

  if (logoBytes) {
    try {
      const png = await doc.embedPng(logoBytes);
      const scale = Math.min(160 / png.width, 45 / png.height);
      const w = png.width * scale;
      const h = png.height * scale;
      page.drawImage(png, { x: MARGIN, y: y - h, width: w, height: h });
      y -= h + 20;
    } catch {
      page.drawText('zyntel', { x: MARGIN, y, size: 22, font: fontMono, color: CYAN });
      y -= 28;
    }
  } else {
    page.drawText('zyntel', { x: MARGIN, y, size: 22, font: fontMono, color: CYAN });
    y -= 28;
  }

  const draw = (text: string, x: number, size = 11, bold = false) => {
    const f = bold ? fontBold : font;
    const t = truncate(text, f, size, rightEdge - x);
    page.drawText(t, { x, y, size, font: f, color: rgb(0.1, 0.1, 0.1) });
    y -= size + 4;
  };

  draw(`Invoice ${invoice.invoice_number}`, MARGIN, 20, true);
  y -= 8;

  const colRightStart = rightEdge - 140;
  let yRight = y + 12;
  const drawRight = (label: string, value: string) => {
    const valW = fontBold.widthOfTextAtSize(value, 9);
    const valX = Math.max(colRightStart, rightEdge - valW - 5);
    page.drawText(label, { x: colRightStart - 70, y: yRight, size: 9, font, color: rgb(0.4, 0.4, 0.4) });
    page.drawText(truncate(value, fontBold, 9, rightEdge - valX), { x: valX, y: yRight, size: 9, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
    yRight -= 14;
  };

  drawRight('Invoice No.', invoice.invoice_number);
  drawRight('Date', (invoice.invoice_date ? new Date(invoice.invoice_date) : new Date(invoice.created_at)).toLocaleDateString());
  if (invoice.due_date) drawRight('Due Date', new Date(invoice.due_date).toLocaleDateString());
  drawRight('Total', formatMoney(invoice.total, invoice.currency));
  y = Math.min(y, yRight - 10);

  draw('Bill To:', MARGIN, 12, true);
  draw(invoice.client_name, MARGIN);
  if (invoice.client_email) draw(invoice.client_email, MARGIN);
  if (invoice.client_phone) draw(invoice.client_phone, MARGIN);
  if (invoice.client_address) draw(invoice.client_address, MARGIN);
  y -= 20;

  const items = (invoice.items as Array<{ description: string; quantity: number; unitPrice?: number; unit_price?: number; amount: number }>).map((i) => ({
    description: i.description,
    quantity: i.quantity,
    unitPrice: i.unitPrice ?? i.unit_price ?? 0,
    amount: i.amount,
  }));

  const descWidth = CONTENT_WIDTH * 0.5;
  const qtyWidth = 35;
  const priceWidth = 75;
  const amtWidth = 90;
  const colDesc = MARGIN;
  const colQty = rightEdge - amtWidth - priceWidth - qtyWidth - 20;
  const colPrice = rightEdge - amtWidth - priceWidth - 10;
  const colAmt = rightEdge - amtWidth;

  page.drawText('Description', { x: colDesc, y, size: 9, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
  page.drawText('Qty', { x: colQty, y, size: 9, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
  page.drawText('Unit Price', { x: colPrice, y, size: 9, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
  page.drawText('Amount', { x: colAmt, y, size: 9, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
  y -= 16;

  const fSize = 9;
  const lineHeight = 12;
  for (const item of items) {
    const descLines = wrapText(item.description, font, fSize, descWidth - 5);
    const qtyStr = String(item.quantity);
    const priceStr = formatMoney(item.unitPrice, '');
    const amtStr = formatMoney(item.amount, invoice.currency);
    const amtW = font.widthOfTextAtSize(amtStr, fSize);
    const rowLines = Math.max(1, descLines.length);
    let rowY = y + 3;
    for (const line of descLines) {
      page.drawText(line, { x: colDesc, y: rowY, size: fSize, font, color: rgb(0.2, 0.2, 0.2) });
      rowY -= lineHeight;
    }
    const firstLineY = y + 3;
    page.drawText(qtyStr, { x: colQty, y: firstLineY, size: fSize, font, color: rgb(0.2, 0.2, 0.2) });
    page.drawText(truncate(priceStr, font, fSize, priceWidth), { x: colPrice, y: firstLineY, size: fSize, font, color: rgb(0.2, 0.2, 0.2) });
    page.drawText(truncate(amtStr, font, fSize, amtWidth), { x: colAmt + amtWidth - Math.min(amtW, amtWidth), y: firstLineY, size: fSize, font, color: rgb(0.2, 0.2, 0.2) });
    y -= rowLines * lineHeight;
  }
  y -= 10;

  const totalStr = formatMoney(invoice.total, invoice.currency);
  const totalW = fontBold.widthOfTextAtSize(totalStr, 11);
  if (invoice.tax_rate > 0) {
    const subStr = `Subtotal: ${formatMoney(invoice.subtotal, invoice.currency)}`;
    const subW = font.widthOfTextAtSize(subStr, fSize);
    page.drawText(subStr, { x: rightEdge - subW, y, size: fSize, font, color: rgb(0.2, 0.2, 0.2) });
    y -= 14;
    const taxStr = `Tax (${invoice.tax_rate}%): ${formatMoney(invoice.tax_amount, invoice.currency)}`;
    const taxW = font.widthOfTextAtSize(taxStr, fSize);
    page.drawText(taxStr, { x: rightEdge - taxW, y, size: fSize, font, color: rgb(0.2, 0.2, 0.2) });
    y -= 14;
  }
  page.drawText(totalStr, { x: rightEdge - totalW, y, size: 11, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
  y -= 22;

  if (invoice.notes) {
    draw('Notes:', MARGIN, 10, true);
    for (const para of invoice.notes.split('\n')) {
      const wrapped = wrapText(para, font, 9, CONTENT_WIDTH);
      for (const line of wrapped) {
        page.drawText(line, { x: MARGIN, y, size: 9, font, color: rgb(0.2, 0.2, 0.2) });
        y -= 12;
      }
    }
  }

  const acc = options.paymentAccount;
  const bankName = acc?.bank_name ?? import.meta.env.INVOICE_BANK_NAME;
  const bankAccount = acc?.account_number ?? import.meta.env.INVOICE_BANK_ACCOUNT;
  const accountName = acc?.account_name ?? import.meta.env.INVOICE_ACCOUNT_NAME;
  const bankAddress = acc?.bank_address ?? import.meta.env.INVOICE_BANK_ADDRESS;
  const swiftCode = acc?.swift_code ?? import.meta.env.INVOICE_SWIFT_CODE;
  const paymentInstructions = acc?.instructions ?? import.meta.env.INVOICE_PAYMENT_INSTRUCTIONS;

  if (bankName || bankAccount || accountName || paymentInstructions) {
    y -= 20;
    page.drawRectangle({ x: MARGIN, y: y - 2, width: CONTENT_WIDTH, height: 1, color: rgb(0.9, 0.9, 0.9) });
    y -= 14;
    draw('Payment Details:', MARGIN, 10, true);
    if (bankName) draw(`Bank: ${bankName}`, MARGIN, 9);
    if (bankAddress) draw(`Address: ${bankAddress}`, MARGIN, 9);
    if (accountName) draw(`Account Name: ${accountName}`, MARGIN, 9);
    if (bankAccount) draw(`Account No: ${bankAccount}`, MARGIN, 9);
    if (swiftCode) draw(`Swift Code: ${swiftCode}`, MARGIN, 9);
    if (paymentInstructions) {
      for (const line of paymentInstructions.split('\n')) draw(line, MARGIN, 9);
    }
  }

  return doc.save();
}

export async function generateReceiptPdf(
  invoice: Invoice,
  payment: PaymentRecord,
  options: PdfOptions = {}
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontMono = await doc.embedFont(StandardFonts.Courier);
  const page = doc.addPage([595, 842]);
  const { width, height } = page.getSize();
  let y = height - 50;

  const baseUrl = options.baseUrl ?? import.meta.env.SITE ?? 'https://zyntel.net';
  let logoBytes = await loadLogo(baseUrl, '/images/logos/zyntel_logo_cyan.png');
  if (!logoBytes) logoBytes = await loadLogo(baseUrl, '/logos/zyntel_logo_cyan.png');

  if (logoBytes) {
    try {
      const png = await doc.embedPng(logoBytes);
      const scale = Math.min(48 / png.width, 48 / png.height);
      const w = png.width * scale;
      const h = png.height * scale;
      page.drawImage(png, { x: 50, y: y - h, width: w, height: h });
      page.drawText('zyntel', { x: 50 + w + 12, y: y - h + 14, size: 18, font: fontMono, color: CYAN });
      y -= h + 24;
    } catch {
      page.drawText('zyntel', { x: 50, y, size: 18, font: fontMono, color: CYAN });
      y -= 28;
    }
  } else {
    page.drawText('zyntel', { x: 50, y, size: 18, font: fontMono, color: CYAN });
    y -= 28;
  }

  const draw = (text: string, x: number, size = 11, bold = false) => {
    const f = bold ? fontBold : font;
    page.drawText(text, { x, y, size, font: f, color: rgb(0.1, 0.1, 0.1) });
    y -= size + 4;
  };

  const receiptNumber = `RCT-${invoice.invoice_number}-P${payment.id}`;
  draw(`Receipt ${receiptNumber}`, MARGIN, 18, true);
  draw(`Receipt No: ${receiptNumber}`, MARGIN);
  draw(`Invoice: ${invoice.invoice_number}`, MARGIN);
  draw(`Date: ${new Date(payment.paid_at).toLocaleDateString()} · ${new Date(payment.paid_at).toLocaleTimeString()}`, MARGIN);
  y -= 20;

  const receiptWidth = 595 - MARGIN * 2;
  page.drawRectangle({ x: MARGIN, y: y - 2, width: receiptWidth, height: 1, color: rgb(0.9, 0.9, 0.9) });
  y -= 20;

  draw('Received From:', MARGIN, 12, true);
  draw(invoice.client_name, MARGIN);
  if (invoice.client_email) draw(invoice.client_email, MARGIN);
  y -= 20;

  draw('Payment Details:', MARGIN, 12, true);
  draw(`Amount Received: ${formatMoney(Number(payment.amount), invoice.currency)}`, MARGIN);
  draw(`Method: ${payment.payment_method.replace(/_/g, ' ')}`, MARGIN);
  if (payment.reference) draw(`Reference: ${payment.reference}`, MARGIN);
  y -= 24;

  page.drawRectangle({ x: MARGIN, y: y - 2, width: receiptWidth, height: 1, color: rgb(0.9, 0.9, 0.9) });

  return doc.save();
}
