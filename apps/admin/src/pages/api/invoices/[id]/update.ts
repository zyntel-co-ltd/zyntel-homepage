import type { APIRoute } from 'astro';
import { updateInvoice } from '@zyntel/db';

export const PATCH: APIRoute = async ({ params, request }) => {
  const id = Number(params.id);
  if (!id || isNaN(id)) {
    return new Response(JSON.stringify({ error: 'Invalid invoice ID' }), { status: 400 });
  }
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
    const { client_id, client_name, client_email, client_phone, client_address, items, tax_rate, currency, due_date, invoice_date, invoice_type, recurring_config, notes, payment_account_id } = body ?? {};
    if (!client_name?.trim() || !Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: 'client_name and items (array) required' }), { status: 400 });
    }
    const invoiceItems = items.map((i: { description?: string; quantity?: number; unitPrice?: number }) => {
      const qty = Number(i.quantity) || 1;
      const unitPrice = Number(i.unitPrice) || 0;
      return { description: String(i.description ?? ''), quantity: qty, unitPrice, amount: qty * unitPrice };
    });
    const invoice = await updateInvoice(id, {
      client_id: client_id != null ? Number(client_id) : null,
      client_name: String(client_name).trim(),
      client_email: client_email != null ? String(client_email).trim() || null : null,
      client_phone: client_phone ? String(client_phone).trim() : null,
      client_address: client_address ? String(client_address).trim() : null,
      items: invoiceItems,
      tax_rate: tax_rate != null ? Number(tax_rate) : undefined,
      currency: currency ? String(currency) : undefined,
      due_date: due_date ? String(due_date) : null,
      invoice_date: invoice_date ? String(invoice_date) : null,
      invoice_type: invoice_type ? String(invoice_type) : undefined,
      recurring_config: recurring_config && typeof recurring_config === 'object' ? recurring_config : undefined,
      notes: notes ? String(notes) : null,
      payment_account_id: payment_account_id != null ? Number(payment_account_id) : null,
    });
    if (!invoice) {
      return new Response(JSON.stringify({ error: 'Invoice not found or not a draft' }), { status: 400 });
    }
    return new Response(JSON.stringify({ ok: true, invoice }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Update invoice error:', e);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
};
