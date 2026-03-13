import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { Invoice, PaymentRecord } from './db';

const formatMoney = (n: number, currency: string): string =>
  currency ? `${currency} ${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : String(Number(n).toLocaleString('en-US', { minimumFractionDigits: 2 }));

export async function generateInvoicePdf(invoice: Invoice): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([595, 842]);
  const { width, height } = page.getSize();
  let y = height - 50;

  const draw = (text: string, x: number, size = 11, bold = false) => {
    const f = bold ? fontBold : font;
    page.drawText(text, { x, y, size, font: f, color: rgb(0.1, 0.1, 0.1) });
    y -= size + 4;
  };

  page.drawText('ZYNTEL', { x: 50, y, size: 24, font: fontBold, color: rgb(0, 0.94, 1) });
  y -= 30;
  draw('Invoice', 50, 18, true);
  draw(`Invoice #: ${invoice.invoice_number}`, 50);
  draw(`Date: ${new Date(invoice.created_at).toLocaleDateString()}`, 50);
  if (invoice.due_date) draw(`Due: ${new Date(invoice.due_date).toLocaleDateString()}`, 50);
  y -= 20;

  draw('Bill To:', 50, 12, true);
  draw(invoice.client_name, 50);
  draw(invoice.client_email, 50);
  if (invoice.client_phone) draw(invoice.client_phone, 50);
  if (invoice.client_address) draw(invoice.client_address, 50);
  y -= 25;

  const items = (invoice.items as Array<{ description: string; quantity: number; unitPrice?: number; unit_price?: number; amount: number }>).map((i) => ({
    description: i.description,
    quantity: i.quantity,
    unitPrice: i.unitPrice ?? i.unit_price ?? 0,
    amount: i.amount,
  }));
  const col1 = 50;
  const col2 = width - 200;
  const col3 = width - 120;
  const col4 = width - 50;

  draw('Description', col1, 10, true);
  page.drawText('Qty', { x: col2, y, size: 10, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
  page.drawText('Unit Price', { x: col3, y, size: 10, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
  page.drawText('Amount', { x: col4, y, size: 10, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
  y -= 15;

  for (const item of items) {
    draw(item.description, col1, 10);
    page.drawText(String(item.quantity), { x: col2, y: y + 4, size: 10, font, color: rgb(0.2, 0.2, 0.2) });
    page.drawText(formatMoney(item.unitPrice, ''), { x: col3, y: y + 4, size: 10, font, color: rgb(0.2, 0.2, 0.2) });
    page.drawText(formatMoney(item.amount, invoice.currency), { x: col4, y: y + 4, size: 10, font, color: rgb(0.2, 0.2, 0.2) });
    y -= 18;
  }
  y -= 10;

  if (invoice.tax_rate > 0) {
    draw(`Subtotal: ${formatMoney(invoice.subtotal, invoice.currency)}`, col3);
    draw(`Tax (${invoice.tax_rate}%): ${formatMoney(invoice.tax_amount, invoice.currency)}`, col3);
  }
  draw(`Total: ${formatMoney(invoice.total, invoice.currency)}`, col3, 12, true);
  y -= 30;

  if (invoice.notes) {
    draw('Notes:', 50, 10, true);
    draw(invoice.notes, 50, 9);
  }

  return doc.save();
}

export async function generateReceiptPdf(
  invoice: Invoice,
  payment: PaymentRecord
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([595, 842]);
  const { width, height } = page.getSize();
  let y = height - 50;

  const draw = (text: string, x: number, size = 11, bold = false) => {
    const f = bold ? fontBold : font;
    page.drawText(text, { x, y, size, font: f, color: rgb(0.1, 0.1, 0.1) });
    y -= size + 4;
  };

  page.drawText('ZYNTEL', { x: 50, y, size: 24, font: fontBold, color: rgb(0, 0.94, 1) });
  y -= 30;
  draw('RECEIPT', 50, 18, true);
  draw(`Receipt for Invoice #${invoice.invoice_number}`, 50);
  draw(`Date: ${new Date(payment.paid_at).toLocaleDateString()}`, 50);
  draw(`Time: ${new Date(payment.paid_at).toLocaleTimeString()}`, 50);
  y -= 25;

  draw('Received From:', 50, 12, true);
  draw(invoice.client_name, 50);
  draw(invoice.client_email, 50);
  y -= 25;

  draw('Payment Details:', 50, 12, true);
  draw(`Amount: ${formatMoney(Number(payment.amount), invoice.currency)}`, 50);
  draw(`Method: ${payment.payment_method.replace('_', ' ')}`, 50);
  if (payment.reference) draw(`Reference: ${payment.reference}`, 50);
  y -= 25;

  draw('Thank you for your payment!', 50, 12);

  return doc.save();
}
