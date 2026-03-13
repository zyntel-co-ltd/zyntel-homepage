import type { APIRoute } from 'astro';
import { createInvoice } from '../../../lib/db';

export const POST: APIRoute = async ({ request }) => {
  if (request.headers.get('content-type') !== 'application/json') {
    return new Response(JSON.stringify({ error: 'Expect JSON' }), { status: 400 });
  }
  const apiKey = request.headers.get('x-api-key') ?? request.headers.get('authorization')?.replace('Bearer ', '');
  const expectedKey = import.meta.env.INVOICE_API_KEY;
  if (expectedKey && apiKey !== expectedKey) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  try {
    const body = await request.json();
    const { client_name, client_email, client_phone, client_address, items, tax_rate, currency, due_date, notes, payment_account_id } = body ?? {};
    if (!client_name?.trim() || !client_email?.trim() || !Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: 'client_name, client_email, and items (array) required' }), { status: 400 });
    }
    const invoiceItems = items.map((i: { description?: string; quantity?: number; unitPrice?: number }) => {
      const qty = Number(i.quantity) || 1;
      const unitPrice = Number(i.unitPrice) || 0;
      return { description: String(i.description ?? ''), quantity: qty, unitPrice, amount: qty * unitPrice };
    });
    const invoice = await createInvoice({
      client_name: String(client_name).trim(),
      client_email: String(client_email).trim(),
      client_phone: client_phone ? String(client_phone).trim() : undefined,
      client_address: client_address ? String(client_address).trim() : undefined,
      items: invoiceItems,
      tax_rate: tax_rate != null ? Number(tax_rate) : undefined,
      currency: currency ? String(currency) : undefined,
      due_date: due_date ? String(due_date) : undefined,
      notes: notes ? String(notes) : undefined,
      payment_account_id: payment_account_id != null ? Number(payment_account_id) : undefined,
    });
    if (!invoice) {
      return new Response(JSON.stringify({ error: 'Database error' }), { status: 500 });
    }
    return new Response(JSON.stringify({ ok: true, invoice }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Create invoice error:', e);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
};
