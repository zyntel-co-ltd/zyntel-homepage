import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { Quote } from '@zyntel/db/schema';

const formatMoney = (n: number, currency: string): string =>
  `${currency} ${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

const CYAN = rgb(0, 0.94, 1);
const MARGIN = 50;
const CONTENT_WIDTH = 595 - MARGIN * 2;

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

export async function generateQuotePdf(
  quote: Quote,
  options: { baseUrl?: string } = {}
): Promise<Uint8Array> {
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

  draw(`Quote ${quote.quoteNumber}`, MARGIN, 20, true);
  y -= 8;

  const colRightStart = rightEdge - 140;
  let yRight = y + 12;
  const drawRight = (label: string, value: string) => {
    const valW = fontBold.widthOfTextAtSize(value, 9);
    const valX = Math.max(colRightStart, rightEdge - valW - 5);
    page.drawText(label, { x: colRightStart - 70, y: yRight, size: 9, font, color: rgb(0.4, 0.4, 0.4) });
    page.drawText(truncate(value, fontBold, 9, rightEdge - valX), {
      x: valX,
      y: yRight,
      size: 9,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    yRight -= 14;
  };

  drawRight('Quote No.', quote.quoteNumber);
  drawRight('Date', new Date(quote.createdAt).toLocaleDateString());
  if (quote.validUntil) drawRight('Valid Until', new Date(quote.validUntil).toLocaleDateString());
  drawRight('Total', formatMoney(quote.total, quote.currency));
  y = Math.min(y, yRight - 10);

  draw('Prepared For:', MARGIN, 12, true);
  if (quote.clientName) draw(quote.clientName, MARGIN);
  if (quote.clientEmail) draw(quote.clientEmail, MARGIN);
  y -= 20;

  const items = quote.lineItems;
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
  y -= 4;
  page.drawRectangle({ x: MARGIN, y: y - 2, width: CONTENT_WIDTH, height: 1, color: rgb(0.85, 0.85, 0.85) });
  y -= 12;

  const fSize = 9;
  const lineHeight = 12;
  for (const item of items) {
    const descLines = wrapText(item.description, font, fSize, descWidth - 5);
    const qtyStr = String(item.quantity);
    const priceStr = formatMoney(item.unitPrice, '');
    const amtStr = formatMoney(item.amount, quote.currency);
    const amtW = font.widthOfTextAtSize(amtStr, fSize);
    const rowLines = Math.max(1, descLines.length);
    let rowY = y + 3;
    for (const line of descLines) {
      page.drawText(line, { x: colDesc, y: rowY, size: fSize, font, color: rgb(0.2, 0.2, 0.2) });
      rowY -= lineHeight;
    }
    const firstLineY = y + 3;
    page.drawText(qtyStr, { x: colQty, y: firstLineY, size: fSize, font, color: rgb(0.2, 0.2, 0.2) });
    page.drawText(truncate(priceStr, font, fSize, priceWidth), {
      x: colPrice,
      y: firstLineY,
      size: fSize,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
    page.drawText(truncate(amtStr, font, fSize, amtWidth), {
      x: colAmt + amtWidth - Math.min(amtW, amtWidth),
      y: firstLineY,
      size: fSize,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= rowLines * lineHeight;
  }
  y -= 10;

  page.drawRectangle({ x: MARGIN, y: y - 2, width: CONTENT_WIDTH, height: 1, color: rgb(0.85, 0.85, 0.85) });
  y -= 14;

  if (quote.taxRate > 0) {
    const subStr = `Subtotal: ${formatMoney(quote.subtotal, quote.currency)}`;
    const subW = font.widthOfTextAtSize(subStr, fSize);
    page.drawText(subStr, { x: rightEdge - subW, y, size: fSize, font, color: rgb(0.2, 0.2, 0.2) });
    y -= 14;
    const taxAmount = (quote.subtotal * quote.taxRate) / 100;
    const taxStr = `Tax (${quote.taxRate}%): ${formatMoney(taxAmount, quote.currency)}`;
    const taxW = font.widthOfTextAtSize(taxStr, fSize);
    page.drawText(taxStr, { x: rightEdge - taxW, y, size: fSize, font, color: rgb(0.2, 0.2, 0.2) });
    y -= 14;
  }
  const totalStr = formatMoney(quote.total, quote.currency);
  const totalW = fontBold.widthOfTextAtSize(totalStr, 11);
  page.drawText(totalStr, { x: rightEdge - totalW, y, size: 11, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
  y -= 30;

  if (quote.notes) {
    draw('Notes:', MARGIN, 10, true);
    for (const para of quote.notes.split('\n')) {
      const wrapped = wrapText(para, font, 9, CONTENT_WIDTH);
      for (const line of wrapped) {
        page.drawText(line, { x: MARGIN, y, size: 9, font, color: rgb(0.2, 0.2, 0.2) });
        y -= 12;
      }
    }
    y -= 10;
  }

  // Terms / disclaimers
  const termsBlocks: Array<{ heading: string; text: string | null | undefined }> = [
    { heading: 'Terms', text: quote.terms },
    { heading: 'Cost & scope notice', text: quote.overageDisclaimer },
  ];
  for (const b of termsBlocks) {
    if (!b.text) continue;
    draw(`${b.heading}:`, MARGIN, 10, true);
    for (const para of String(b.text).split('\n')) {
      const wrapped = wrapText(para, font, 9, CONTENT_WIDTH);
      for (const line of wrapped) {
        page.drawText(line, { x: MARGIN, y, size: 9, font, color: rgb(0.2, 0.2, 0.2) });
        y -= 12;
      }
    }
    y -= 10;
  }

  // Signature line
  y -= 20;
  page.drawRectangle({ x: MARGIN, y: y - 2, width: CONTENT_WIDTH, height: 1, color: rgb(0.85, 0.85, 0.85) });
  y -= 16;
  draw('Acceptance', MARGIN, 10, true);
  draw('Client signature: _________________________________   Date: _______________', MARGIN, 9);
  y -= 10;

  // Footer
  if (quote.validUntil) {
    const validUntilFormatted = new Date(quote.validUntil).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    draw(`This quote is valid until ${validUntilFormatted}.`, MARGIN, 9);
  }
  y -= 4;
  page.drawRectangle({ x: MARGIN, y: y - 2, width: CONTENT_WIDTH, height: 1, color: rgb(0.9, 0.9, 0.9) });
  y -= 14;
  page.drawText('Prepared by Zyntel Limited · Kampala, Uganda · zyntel.net', {
    x: MARGIN,
    y,
    size: 8,
    font,
    color: rgb(0.6, 0.6, 0.6),
  });

  return doc.save();
}
