import type { APIRoute } from 'astro';
import { getInvoice, recordPayment, type PaymentMethod } from '@zyntel/db';

const VALID_METHODS: PaymentMethod[] = ['cash', 'bank_transfer', 'mobile_money', 'flutterwave', 'cheque', 'other'];

export const POST: APIRoute = async ({ params, request }) => {
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
    const invoice = await getInvoice(id);
    if (!invoice) {
      return new Response(JSON.stringify({ error: 'Invoice not found' }), { status: 404 });
    }
    const body = await request.json();
    const { amount, payment_method, reference, paid_at } = body ?? {};
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      return new Response(JSON.stringify({ error: 'Valid amount required' }), { status: 400 });
    }
    const method = String(payment_method ?? 'cash').toLowerCase().replace(/\s/g, '_') as PaymentMethod;
    if (!VALID_METHODS.includes(method)) {
      return new Response(JSON.stringify({ error: `payment_method must be one of: ${VALID_METHODS.join(', ')}` }), { status: 400 });
    }
    const payment = await recordPayment({
      invoice_id: id,
      amount: amt,
      payment_method: method,
      reference: reference ? String(reference) : undefined,
      paid_at: paid_at ? String(paid_at) : undefined,
    });
    if (!payment) {
      return new Response(JSON.stringify({ error: 'Failed to record payment' }), { status: 500 });
    }
    return new Response(JSON.stringify({ ok: true, payment, invoice: { ...invoice, status: payment ? 'paid' : invoice.status } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Record payment error:', e);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
};
