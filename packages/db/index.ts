import { neon } from '@neondatabase/serverless';
import type { InvoiceItem, Invoice, PaymentMethod, PaymentRecord, Client, PaymentAccount, SavedItem, RecurringConfig } from './schema';

export * from './schema';

const sql = neon(import.meta.env.DATABASE_URL ?? '');

export { sql };

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
  client_id?: number;
  client_name: string;
  client_email?: string | null;
  client_phone?: string;
  client_address?: string;
  items: InvoiceItem[];
  tax_rate?: number;
  currency?: string;
  due_date?: string;
  invoice_date?: string;
  invoice_type?: string;
  recurring_config?: RecurringConfig | null;
  notes?: string;
  payment_account_id?: number;
}): Promise<Invoice | null> {
  if (!import.meta.env.DATABASE_URL) return null;
  const items = data.items;
  const subtotal = items.reduce((s, i) => s + i.amount, 0);
  const taxRate = data.tax_rate ?? 0;
  const taxAmount = (subtotal * taxRate) / 100;
  const total = subtotal + taxAmount;
  const invoiceNumber = nextInvoiceNumber();
  const clientEmail = data.client_email?.trim() || null;
  const invDate = data.invoice_date ?? new Date().toISOString().slice(0, 10);
  const invType = data.invoice_type ?? 'one_off';
  try {
    const rows = await sql`
      INSERT INTO invoices (invoice_number, client_id, client_name, client_email, client_phone, client_address, items, subtotal, tax_rate, tax_amount, total, currency, due_date, invoice_date, invoice_type, recurring_config, notes, payment_account_id, status)
      VALUES (${invoiceNumber}, ${data.client_id ?? null}, ${data.client_name}, ${clientEmail}, ${data.client_phone ?? null}, ${data.client_address ?? null}, ${JSON.stringify(items)}, ${subtotal}, ${taxRate}, ${taxAmount}, ${total}, ${data.currency ?? 'UGX'}, ${data.due_date ?? null}, ${invDate}, ${invType}, ${data.recurring_config ? JSON.stringify(data.recurring_config) : null}, ${data.notes ?? null}, ${data.payment_account_id ?? null}, 'draft')
      RETURNING *
    `;
    return (rows[0] as Invoice) ?? null;
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    if (err?.code === '42703' || err?.message?.includes('invoice_date') || err?.message?.includes('does not exist')) {
      const rows = await sql`
        INSERT INTO invoices (invoice_number, client_id, client_name, client_email, client_phone, client_address, items, subtotal, tax_rate, tax_amount, total, currency, due_date, notes, payment_account_id, status)
        VALUES (${invoiceNumber}, ${data.client_id ?? null}, ${data.client_name}, ${clientEmail ?? ''}, ${data.client_phone ?? null}, ${data.client_address ?? null}, ${JSON.stringify(items)}, ${subtotal}, ${taxRate}, ${taxAmount}, ${total}, ${data.currency ?? 'UGX'}, ${data.due_date ?? null}, ${data.notes ?? null}, ${data.payment_account_id ?? null}, 'draft')
        RETURNING *
      `;
      return (rows[0] as Invoice) ?? null;
    }
    throw e;
  }
}

export async function updateInvoice(id: number, data: {
  client_id?: number | null;
  client_name: string;
  client_email?: string | null;
  client_phone?: string | null;
  client_address?: string | null;
  items: InvoiceItem[];
  tax_rate?: number;
  currency?: string;
  due_date?: string | null;
  invoice_date?: string | null;
  invoice_type?: string;
  recurring_config?: RecurringConfig | null;
  notes?: string | null;
  payment_account_id?: number | null;
}): Promise<Invoice | null> {
  if (!import.meta.env.DATABASE_URL) return null;
  const inv = await getInvoice(id);
  if (!inv || inv.status !== 'draft') return null;
  const items = data.items;
  const subtotal = items.reduce((s, i) => s + i.amount, 0);
  const taxRate = data.tax_rate ?? inv.tax_rate ?? 0;
  const taxAmount = (subtotal * taxRate) / 100;
  const total = subtotal + taxAmount;
  const recConfig = data.recurring_config !== undefined
    ? (data.recurring_config ? JSON.stringify(data.recurring_config) : null)
    : (inv.recurring_config ? JSON.stringify(inv.recurring_config) : null);
  await sql`
    UPDATE invoices SET
      client_id = ${data.client_id ?? null},
      client_name = ${data.client_name},
      client_email = ${data.client_email ?? null},
      client_phone = ${data.client_phone ?? null},
      client_address = ${data.client_address ?? null},
      items = ${JSON.stringify(items)},
      subtotal = ${subtotal},
      tax_rate = ${taxRate},
      tax_amount = ${taxAmount},
      total = ${total},
      currency = ${data.currency ?? inv.currency ?? 'UGX'},
      due_date = ${data.due_date ?? null},
      invoice_date = ${data.invoice_date ?? null},
      invoice_type = ${data.invoice_type ?? (inv.invoice_type ?? 'one_off')},
      recurring_config = ${recConfig},
      notes = ${data.notes ?? null},
      payment_account_id = ${data.payment_account_id ?? null},
      updated_at = NOW()
    WHERE id = ${id} AND status = 'draft'
  `;
  return getInvoice(id);
}

function normalizeClientRow(row: Record<string, unknown>): Client {
  const email = String(row.email ?? '');
  let emails: string[] | null = null;
  const raw = row.emails;
  if (raw != null) {
    if (Array.isArray(raw)) emails = raw.map((e) => String(e).trim()).filter(Boolean);
    else if (typeof raw === 'string') {
      try {
        const p = JSON.parse(raw) as unknown;
        if (Array.isArray(p)) emails = p.map((e) => String(e).trim()).filter(Boolean);
      } catch {
        emails = null;
      }
    }
  }
  if (!emails?.length && email) emails = [email];
  return {
    id: Number(row.id),
    name: String(row.name),
    email: emails?.[0] ?? email,
    emails: emails?.length ? emails : email ? [email] : [],
    phone: row.phone != null ? String(row.phone) : null,
    address: row.address != null ? String(row.address) : null,
    created_at: String(row.created_at),
  };
}

export async function listClients(): Promise<Client[]> {
  if (!import.meta.env.DATABASE_URL) return [];
  try {
    const rows = await sql`SELECT * FROM clients ORDER BY name ASC`;
    return (rows as Record<string, unknown>[]).map(normalizeClientRow);
  } catch {
    return [];
  }
}

export async function getClient(id: number): Promise<Client | null> {
  if (!import.meta.env.DATABASE_URL) return null;
  const rows = await sql`SELECT * FROM clients WHERE id = ${id}`;
  const row = rows[0] as Record<string, unknown> | undefined;
  return row ? normalizeClientRow(row) : null;
}

export async function createClient(data: { name: string; email: string; phone?: string; address?: string; emails?: string[] }): Promise<Client | null> {
  if (!import.meta.env.DATABASE_URL) return null;
  const primary = String(data.email).trim();
  const list = (data.emails?.length ? data.emails.map((e) => String(e).trim()).filter(Boolean) : [primary]).filter(Boolean);
  if (!list.length) return null;
  const emailCol = list[0];
  const emailsJson = JSON.stringify(list);
  try {
    const rows = await sql`
      INSERT INTO clients (name, email, phone, address, emails)
      VALUES (${data.name}, ${emailCol}, ${data.phone ?? null}, ${data.address ?? null}, ${emailsJson})
      RETURNING *
    `;
    return normalizeClientRow(rows[0] as Record<string, unknown>);
  } catch {
    try {
      const rows = await sql`
        INSERT INTO clients (name, email, phone, address)
        VALUES (${data.name}, ${emailCol}, ${data.phone ?? null}, ${data.address ?? null})
        RETURNING *
      `;
      return normalizeClientRow(rows[0] as Record<string, unknown>);
    } catch {
      return null;
    }
  }
}

export async function updateClient(id: number, data: { name?: string; email?: string; emails?: string[]; phone?: string; address?: string }): Promise<Client | null> {
  if (!import.meta.env.DATABASE_URL) return null;
  const existing = await getClient(id);
  if (!existing) return null;
  const name = data.name != null ? String(data.name).trim() : existing.name;
  let emailsList: string[];
  if (data.emails != null) {
    emailsList = data.emails.map((e) => String(e).trim()).filter(Boolean);
    if (emailsList.length === 0) return null;
  } else if (data.email != null) {
    const one = String(data.email).trim();
    if (!one) return null;
    const rest = (existing.emails ?? []).slice(1).filter((e) => e !== one);
    emailsList = [one, ...rest];
  } else {
    emailsList = existing.emails?.length ? [...existing.emails] : [existing.email].filter(Boolean);
  }
  const email = emailsList[0];
  const phone = data.phone !== undefined ? (data.phone ? String(data.phone).trim() : null) : existing.phone;
  const address = data.address !== undefined ? (data.address ? String(data.address).trim() : null) : existing.address;
  if (!name || !email) return null;
  const emailsJson = JSON.stringify(emailsList);
  try {
    const rows = await sql`
      UPDATE clients SET name = ${name}, email = ${email}, emails = ${emailsJson}, phone = ${phone}, address = ${address}
      WHERE id = ${id}
      RETURNING *
    `;
    return normalizeClientRow(rows[0] as Record<string, unknown>);
  } catch {
    try {
      const rows = await sql`
        UPDATE clients SET name = ${name}, email = ${email}, phone = ${phone}, address = ${address}
        WHERE id = ${id}
        RETURNING *
      `;
      return normalizeClientRow(rows[0] as Record<string, unknown>);
    } catch {
      return null;
    }
  }
}

export async function listPaymentAccounts(): Promise<PaymentAccount[]> {
  if (!import.meta.env.DATABASE_URL) return [];
  const rows = await sql`SELECT * FROM payment_accounts ORDER BY name ASC`;
  return rows as PaymentAccount[];
}

export async function getPaymentAccount(id: number): Promise<PaymentAccount | null> {
  if (!import.meta.env.DATABASE_URL) return null;
  const rows = await sql`SELECT * FROM payment_accounts WHERE id = ${id}`;
  return (rows[0] as PaymentAccount) ?? null;
}

export async function createPaymentAccount(data: {
  name: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  bank_address?: string;
  swift_code?: string;
  instructions?: string;
}): Promise<PaymentAccount | null> {
  if (!import.meta.env.DATABASE_URL) return null;
  const rows = await sql`
    INSERT INTO payment_accounts (name, bank_name, account_number, account_name, bank_address, swift_code, instructions)
    VALUES (${data.name}, ${data.bank_name}, ${data.account_number}, ${data.account_name}, ${data.bank_address ?? null}, ${data.swift_code ?? null}, ${data.instructions ?? null})
    RETURNING *
  `;
  return (rows[0] as PaymentAccount) ?? null;
}

/** Update invoice snapshot email (any status; for linking sends to chosen address). */
export async function patchInvoiceClientEmail(id: number, client_email: string | null): Promise<Invoice | null> {
  if (!import.meta.env.DATABASE_URL) return null;
  await sql`UPDATE invoices SET client_email = ${client_email}, updated_at = NOW() WHERE id = ${id} AND deleted_at IS NULL`;
  return getInvoice(id);
}

export async function getInvoice(id: number, includeDeleted = false): Promise<Invoice | null> {
  if (!import.meta.env.DATABASE_URL) return null;
  const rows = includeDeleted
    ? await sql`SELECT * FROM invoices WHERE id = ${id}`
    : await sql`SELECT * FROM invoices WHERE id = ${id} AND deleted_at IS NULL`;
  return (rows[0] as Invoice) ?? null;
}

export async function getInvoiceByNumber(invoiceNumber: string): Promise<Invoice | null> {
  if (!import.meta.env.DATABASE_URL) return null;
  const rows = await sql`SELECT * FROM invoices WHERE invoice_number = ${invoiceNumber} AND deleted_at IS NULL`;
  return (rows[0] as Invoice) ?? null;
}

export async function getPaymentsForInvoice(invoiceId: number): Promise<PaymentRecord[]> {
  if (!import.meta.env.DATABASE_URL) return [];
  const rows = await sql`SELECT * FROM payment_records WHERE invoice_id = ${invoiceId} ORDER BY paid_at ASC`;
  return rows as PaymentRecord[];
}

export async function getPayment(id: number): Promise<PaymentRecord | null> {
  if (!import.meta.env.DATABASE_URL) return null;
  const rows = await sql`SELECT * FROM payment_records WHERE id = ${id}`;
  return (rows[0] as PaymentRecord) ?? null;
}

export async function recordPayment(data: {
  invoice_id: number;
  amount: number;
  payment_method: PaymentMethod;
  reference?: string;
  paid_at?: string;
}): Promise<PaymentRecord | null> {
  if (!import.meta.env.DATABASE_URL) return null;
  const invCheck = await sql`SELECT id FROM invoices WHERE id = ${data.invoice_id} AND deleted_at IS NULL`;
  if (invCheck.length === 0) return null;
  const paidAt = data.paid_at ? new Date(data.paid_at) : new Date();
  const rows = await sql`
    INSERT INTO payment_records (invoice_id, amount, payment_method, reference, paid_at)
    VALUES (${data.invoice_id}, ${data.amount}, ${data.payment_method}, ${data.reference ?? null}, ${paidAt})
    RETURNING *
  `;
  const payment = (rows[0] as PaymentRecord) ?? null;
  if (payment) {
    const invRows = await sql`SELECT total FROM invoices WHERE id = ${data.invoice_id} AND deleted_at IS NULL`;
    const inv = invRows[0] as { total: number };
    const sumRows = await sql`SELECT COALESCE(SUM(amount), 0) as total_paid FROM payment_records WHERE invoice_id = ${data.invoice_id}`;
    const totalPaid = Number((sumRows[0] as { total_paid: string }).total_paid);
    const newStatus = totalPaid >= inv.total ? 'paid' : totalPaid > 0 ? 'partial' : 'sent';
    await sql`UPDATE invoices SET status = ${newStatus}, updated_at = NOW() WHERE id = ${data.invoice_id}`;
  }
  return payment;
}

export async function updateInvoiceStatus(id: number, status: string): Promise<void> {
  if (!import.meta.env.DATABASE_URL) return;
  await sql`UPDATE invoices SET status = ${status}, updated_at = NOW() WHERE id = ${id}`;
}

export async function listInvoices(limit = 50, type?: string): Promise<Invoice[]> {
  if (!import.meta.env.DATABASE_URL) return [];
  if (type) {
    const rows = await sql`SELECT * FROM invoices WHERE invoice_type = ${type} AND deleted_at IS NULL ORDER BY created_at DESC LIMIT ${limit}`;
    return rows as Invoice[];
  }
  const rows = await sql`SELECT * FROM invoices WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT ${limit}`;
  return rows as Invoice[];
}

export async function listDeletedInvoices(limit = 50): Promise<Invoice[]> {
  if (!import.meta.env.DATABASE_URL) return [];
  const rows = await sql`SELECT * FROM invoices WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC LIMIT ${limit}`;
  return rows as Invoice[];
}

export async function softDeleteInvoice(id: number): Promise<boolean> {
  if (!import.meta.env.DATABASE_URL) return false;
  const result = await sql`UPDATE invoices SET deleted_at = NOW() WHERE id = ${id} AND deleted_at IS NULL RETURNING id`;
  return result.length > 0;
}

export async function restoreInvoice(id: number): Promise<boolean> {
  if (!import.meta.env.DATABASE_URL) return false;
  const result = await sql`UPDATE invoices SET deleted_at = NULL WHERE id = ${id} AND deleted_at IS NOT NULL RETURNING id`;
  return result.length > 0;
}

// --- Saved items ---

export async function listSavedItems(): Promise<SavedItem[]> {
  if (!import.meta.env.DATABASE_URL) return [];
  try {
    const rows = await sql`SELECT * FROM saved_items ORDER BY name ASC`;
    return rows as SavedItem[];
  } catch {
    return [];
  }
}

export async function createSavedItem(data: {
  name: string;
  description: string;
  unit_price: number;
  default_quantity?: number;
}): Promise<SavedItem | null> {
  if (!import.meta.env.DATABASE_URL) return null;
  const qty = data.default_quantity ?? 1;
  const rows = await sql`
    INSERT INTO saved_items (name, description, unit_price, default_quantity)
    VALUES (${data.name}, ${data.description}, ${data.unit_price}, ${qty})
    RETURNING *
  `;
  return (rows[0] as SavedItem) ?? null;
}

export async function deleteSavedItem(id: number): Promise<boolean> {
  if (!import.meta.env.DATABASE_URL) return false;
  await sql`DELETE FROM saved_items WHERE id = ${id}`;
  return true;
}

// --- Recurring invoices ---

export async function getRecurringInvoicesDue(): Promise<Invoice[]> {
  if (!import.meta.env.DATABASE_URL) return [];
  const today = new Date().toISOString().slice(0, 10);
  try {
    const rows = await sql`
      SELECT * FROM invoices
      WHERE invoice_type = 'subscription'
        AND deleted_at IS NULL
        AND recurring_config IS NOT NULL
        AND (recurring_config->>'next_run') <= ${today}
        AND status IN ('sent', 'paid')
      ORDER BY (recurring_config->>'next_run') ASC
    `;
    return rows as Invoice[];
  } catch {
    return [];
  }
}

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

export async function processRecurringInvoice(source: Invoice): Promise<Invoice | null> {
  if (!import.meta.env.DATABASE_URL || !source.recurring_config) return null;
  const cfg = source.recurring_config;
  const nextRun = cfg.next_run;
  const freq = cfg.frequency ?? 'monthly';
  const months = freq === 'monthly' ? 1 : freq === 'quarterly' ? 3 : 12;

  const newInvoice = await createInvoice({
    client_id: source.client_id,
    client_name: source.client_name,
    client_email: source.client_email,
    client_phone: source.client_phone ?? undefined,
    client_address: source.client_address ?? undefined,
    items: source.items,
    tax_rate: source.tax_rate,
    currency: source.currency,
    due_date: addMonths(nextRun, 1),
    invoice_date: nextRun,
    invoice_type: 'subscription',
    recurring_config: null,
    notes: source.notes ?? undefined,
    payment_account_id: source.payment_account_id,
  });

  if (newInvoice) {
    const newNextRun = addMonths(nextRun, months);
    const newCfg = { ...cfg, next_run: newNextRun, source_invoice_id: source.id };
    await sql`
      UPDATE invoices SET
        recurring_config = ${JSON.stringify(newCfg)},
        updated_at = NOW()
      WHERE id = ${source.id}
    `;
  }
  return newInvoice;
}
