import { sql } from '@zyntel/db';
import { createInvoice } from '@zyntel/db';
import type { Quote, QuoteLineItem, QuoteStatus } from '@zyntel/db/schema';

function rowToQuote(row: Record<string, any>): Quote {
  return {
    id: String(row.id),
    quoteNumber: String(row.quote_number),
    clientId: row.client_id != null ? Number(row.client_id) : null,
    title: String(row.title),
    lineItems: (row.line_items ?? []) as QuoteLineItem[],
    subtotal: Number(row.subtotal),
    taxRate: Number(row.tax_rate),
    total: Number(row.total),
    currency: String(row.currency),
    status: String(row.status) as QuoteStatus,
    validUntil: row.valid_until ? String(row.valid_until).slice(0, 10) : null,
    notes: row.notes != null ? String(row.notes) : null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    clientName: row.client_name != null ? String(row.client_name) : null,
    clientEmail: row.client_email != null ? String(row.client_email) : null,
  };
}

async function nextQuoteNumber(): Promise<string> {
  const rows = await sql`
    SELECT 'Q-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('quote_number_seq')::text, 3, '0') AS quote_number
  `;
  return String((rows[0] as any).quote_number);
}

export async function getAllQuotes(): Promise<Quote[]> {
  if (!import.meta.env.DATABASE_URL) return [];
  const rows = await sql`
    SELECT q.*, c.name AS client_name, c.email AS client_email
    FROM quotes q
    LEFT JOIN clients c ON c.id = q.client_id
    ORDER BY q.created_at DESC
  `;
  return (rows as Record<string, any>[]).map(rowToQuote);
}

export async function getQuoteById(id: string): Promise<Quote | null> {
  if (!import.meta.env.DATABASE_URL) return null;
  const rows = await sql`
    SELECT q.*, c.name AS client_name, c.email AS client_email
    FROM quotes q
    LEFT JOIN clients c ON c.id = q.client_id
    WHERE q.id = ${id}
  `;
  const row = rows[0] as Record<string, any> | undefined;
  return row ? rowToQuote(row) : null;
}

export async function getQuotesByClient(clientId: number): Promise<Quote[]> {
  if (!import.meta.env.DATABASE_URL) return [];
  const rows = await sql`
    SELECT q.*, c.name AS client_name, c.email AS client_email
    FROM quotes q
    LEFT JOIN clients c ON c.id = q.client_id
    WHERE q.client_id = ${clientId}
    ORDER BY q.created_at DESC
  `;
  return (rows as Record<string, any>[]).map(rowToQuote);
}

export async function createQuote(data: {
  clientId?: number | null;
  title: string;
  lineItems: QuoteLineItem[];
  taxRate?: number;
  currency?: string;
  validUntil?: string | null;
  notes?: string | null;
}): Promise<Quote> {
  if (!import.meta.env.DATABASE_URL) throw new Error('DATABASE_URL must be set');
  const lineItems = data.lineItems;
  const subtotal = lineItems.reduce((s, i) => s + i.amount, 0);
  const taxRate = data.taxRate ?? 0;
  const total = subtotal + (subtotal * taxRate) / 100;
  const quoteNumber = await nextQuoteNumber();

  const rows = await sql`
    INSERT INTO quotes (quote_number, client_id, title, line_items, subtotal, tax_rate, total, currency, valid_until, notes)
    VALUES (
      ${quoteNumber},
      ${data.clientId ?? null},
      ${data.title},
      ${JSON.stringify(lineItems)},
      ${subtotal},
      ${taxRate},
      ${total},
      ${data.currency ?? 'UGX'},
      ${data.validUntil ?? null},
      ${data.notes ?? null}
    )
    RETURNING *
  `;
  return rowToQuote(rows[0] as Record<string, any>);
}

export async function updateQuote(
  id: string,
  data: Partial<{
    clientId: number | null;
    title: string;
    lineItems: QuoteLineItem[];
    taxRate: number;
    currency: string;
    validUntil: string | null;
    notes: string | null;
  }>
): Promise<Quote> {
  if (!import.meta.env.DATABASE_URL) throw new Error('DATABASE_URL must be set');
  const updates: string[] = [];
  const values: any[] = [];

  if (data.clientId !== undefined) { updates.push(`client_id = $${values.length + 1}`); values.push(data.clientId); }
  if (data.title !== undefined) { updates.push(`title = $${values.length + 1}`); values.push(data.title); }
  if (data.currency !== undefined) { updates.push(`currency = $${values.length + 1}`); values.push(data.currency); }
  if (data.validUntil !== undefined) { updates.push(`valid_until = $${values.length + 1}`); values.push(data.validUntil); }
  if (data.notes !== undefined) { updates.push(`notes = $${values.length + 1}`); values.push(data.notes); }

  if (data.lineItems !== undefined) {
    const items = data.lineItems;
    const subtotal = items.reduce((s, i) => s + i.amount, 0);
    const existingRows = await sql`SELECT tax_rate FROM quotes WHERE id = ${id}`;
    const taxRate = data.taxRate ?? Number((existingRows[0] as any)?.tax_rate ?? 0);
    const total = subtotal + (subtotal * taxRate) / 100;
    updates.push(`line_items = $${values.length + 1}`); values.push(JSON.stringify(items));
    updates.push(`subtotal = $${values.length + 1}`); values.push(subtotal);
    updates.push(`tax_rate = $${values.length + 1}`); values.push(taxRate);
    updates.push(`total = $${values.length + 1}`); values.push(total);
  } else if (data.taxRate !== undefined) {
    const existingRows = await sql`SELECT subtotal FROM quotes WHERE id = ${id}`;
    const subtotal = Number((existingRows[0] as any)?.subtotal ?? 0);
    const total = subtotal + (subtotal * data.taxRate) / 100;
    updates.push(`tax_rate = $${values.length + 1}`); values.push(data.taxRate);
    updates.push(`total = $${values.length + 1}`); values.push(total);
  }

  if (!updates.length) {
    const existing = await getQuoteById(id);
    if (!existing) throw new Error('Quote not found');
    return existing;
  }

  values.push(id);
  const query = `
    UPDATE quotes
    SET ${updates.join(', ')}, updated_at = now()
    WHERE id = $${values.length}
    RETURNING *
  `;
  const rows = await sql(query, values);
  const row = rows[0] as Record<string, any> | undefined;
  if (!row) throw new Error('Quote not found');
  return rowToQuote(row);
}

export async function updateQuoteStatus(id: string, status: QuoteStatus): Promise<Quote> {
  if (!import.meta.env.DATABASE_URL) throw new Error('DATABASE_URL must be set');
  const rows = await sql`
    UPDATE quotes SET status = ${status}, updated_at = now() WHERE id = ${id} RETURNING *
  `;
  const row = rows[0] as Record<string, any> | undefined;
  if (!row) throw new Error('Quote not found');
  return rowToQuote(row);
}

export async function convertQuoteToInvoice(id: string): Promise<{ invoiceId: number }> {
  if (!import.meta.env.DATABASE_URL) throw new Error('DATABASE_URL must be set');
  const quote = await getQuoteById(id);
  if (!quote) throw new Error('Quote not found');
  if (quote.status === 'converted') throw new Error('Quote already converted');

  const invoice = await createInvoice({
    client_id: quote.clientId ?? undefined,
    client_name: quote.clientName ?? 'Client',
    client_email: quote.clientEmail ?? undefined,
    items: quote.lineItems.map((li) => ({
      description: li.description,
      quantity: li.quantity,
      unitPrice: li.unitPrice,
      amount: li.amount,
    })),
    tax_rate: quote.taxRate,
    currency: quote.currency,
    notes: quote.notes ?? undefined,
  });

  if (!invoice) throw new Error('Failed to create invoice from quote');

  await sql`
    UPDATE quotes SET status = 'converted', updated_at = now() WHERE id = ${id}
  `;

  return { invoiceId: invoice.id };
}

export async function deleteQuote(id: string): Promise<void> {
  if (!import.meta.env.DATABASE_URL) throw new Error('DATABASE_URL must be set');
  await sql`DELETE FROM quotes WHERE id = ${id}`;
}
