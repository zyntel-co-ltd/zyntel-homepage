import { neon } from '@neondatabase/serverless';

const sql = neon(import.meta.env.DATABASE_URL ?? '');

export type PaymentMethod = 'cash' | 'bank_transfer' | 'mobile_money' | 'flutterwave' | 'cheque' | 'other';

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  client_name: string;
  client_email: string;
  client_phone: string | null;
  client_address: string | null;
  items: InvoiceItem[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  currency: string;
  status: string;
  due_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentRecord {
  id: number;
  invoice_id: number;
  amount: number;
  payment_method: PaymentMethod;
  reference: string | null;
  paid_at: string;
  created_at: string;
}

export async function insertLead(email: string, name?: string, source = 'newsletter') {
  if (!import.meta.env.DATABASE_URL) return;
  await sql`INSERT INTO leads (email, name, source) VALUES (${email}, ${name ?? null}, ${source})`;
}

export async function insertContactSubmission(email: string, name?: string, message?: string) {
  if (!import.meta.env.DATABASE_URL) return;
  await sql`INSERT INTO contact_submissions (email, name, message) VALUES (${email}, ${name ?? null}, ${message ?? null})`;
}

export async function insertPaymentEvent(data: {
  tx_ref: string;
  flw_ref?: string;
  amount: number;
  currency: string;
  status: string;
  customer_email?: string;
  meta?: Record<string, unknown>;
}) {
  if (!import.meta.env.DATABASE_URL) return;
  await sql`INSERT INTO payment_events (tx_ref, flw_ref, amount, currency, status, customer_email, meta)
    VALUES (${data.tx_ref}, ${data.flw_ref ?? null}, ${data.amount}, ${data.currency}, ${data.status}, ${data.customer_email ?? null}, ${JSON.stringify(data.meta ?? {})})`;
}

// --- Invoicing ---

function nextInvoiceNumber(): string {
  const y = new Date().getFullYear();
  const m = String(new Date().getMonth() + 1).padStart(2, '0');
  const r = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `INV-${y}${m}-${r}`;
}

export async function createInvoice(data: {
  client_name: string;
  client_email: string;
  client_phone?: string;
  client_address?: string;
  items: InvoiceItem[];
  tax_rate?: number;
  currency?: string;
  due_date?: string;
  notes?: string;
}): Promise<Invoice | null> {
  if (!import.meta.env.DATABASE_URL) return null;
  const items = data.items;
  const subtotal = items.reduce((s, i) => s + i.amount, 0);
  const taxRate = data.tax_rate ?? 0;
  const taxAmount = (subtotal * taxRate) / 100;
  const total = subtotal + taxAmount;
  const invoiceNumber = nextInvoiceNumber();
  const rows = await sql`
    INSERT INTO invoices (invoice_number, client_name, client_email, client_phone, client_address, items, subtotal, tax_rate, tax_amount, total, currency, due_date, notes, status)
    VALUES (${invoiceNumber}, ${data.client_name}, ${data.client_email}, ${data.client_phone ?? null}, ${data.client_address ?? null}, ${JSON.stringify(items)}, ${subtotal}, ${taxRate}, ${taxAmount}, ${total}, ${data.currency ?? 'UGX'}, ${data.due_date ?? null}, ${data.notes ?? null}, 'draft')
    RETURNING *
  `;
  return (rows[0] as Invoice) ?? null;
}

export async function getInvoice(id: number): Promise<Invoice | null> {
  if (!import.meta.env.DATABASE_URL) return null;
  const rows = await sql`SELECT * FROM invoices WHERE id = ${id}`;
  return (rows[0] as Invoice) ?? null;
}

export async function getInvoiceByNumber(invoiceNumber: string): Promise<Invoice | null> {
  if (!import.meta.env.DATABASE_URL) return null;
  const rows = await sql`SELECT * FROM invoices WHERE invoice_number = ${invoiceNumber}`;
  return (rows[0] as Invoice) ?? null;
}

export async function getPaymentsForInvoice(invoiceId: number): Promise<PaymentRecord[]> {
  if (!import.meta.env.DATABASE_URL) return [];
  const rows = await sql`SELECT * FROM payment_records WHERE invoice_id = ${invoiceId} ORDER BY paid_at ASC`;
  return rows as PaymentRecord[];
}

export async function recordPayment(data: {
  invoice_id: number;
  amount: number;
  payment_method: PaymentMethod;
  reference?: string;
  paid_at?: string;
}): Promise<PaymentRecord | null> {
  if (!import.meta.env.DATABASE_URL) return null;
  const paidAt = data.paid_at ? new Date(data.paid_at) : new Date();
  const rows = await sql`
    INSERT INTO payment_records (invoice_id, amount, payment_method, reference, paid_at)
    VALUES (${data.invoice_id}, ${data.amount}, ${data.payment_method}, ${data.reference ?? null}, ${paidAt})
    RETURNING *
  `;
  const payment = (rows[0] as PaymentRecord) ?? null;
  if (payment) {
    const invRows = await sql`SELECT total FROM invoices WHERE id = ${data.invoice_id}`;
    const inv = invRows[0] as { total: number };
    const sumRows = await sql`SELECT COALESCE(SUM(amount), 0) as total_paid FROM payment_records WHERE invoice_id = ${data.invoice_id}`;
    const totalPaid = Number((sumRows[0] as { total_paid: string }).total_paid);
    const newStatus = totalPaid >= inv.total ? 'paid' : 'sent';
    await sql`UPDATE invoices SET status = ${newStatus}, updated_at = NOW() WHERE id = ${data.invoice_id}`;
  }
  return payment;
}

export async function updateInvoiceStatus(id: number, status: string): Promise<void> {
  if (!import.meta.env.DATABASE_URL) return;
  await sql`UPDATE invoices SET status = ${status}, updated_at = NOW() WHERE id = ${id}`;
}

export async function listInvoices(limit = 50): Promise<Invoice[]> {
  if (!import.meta.env.DATABASE_URL) return [];
  const rows = await sql`SELECT * FROM invoices ORDER BY created_at DESC LIMIT ${limit}`;
  return rows as Invoice[];
}
