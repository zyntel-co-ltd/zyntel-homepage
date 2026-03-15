import type { APIRoute } from 'astro';
import { getInvoice, getPaymentsForInvoice } from '@zyntel/db';

export const GET: APIRoute = async ({ params, request }) => {
  const id = Number(params.id);
  if (!id || isNaN(id)) {
    return new Response(JSON.stringify({ error: 'Invalid invoice ID' }), { status: 400 });
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
    const payments = await getPaymentsForInvoice(id);
    const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);
    const balance = Math.max(0, invoice.total - totalPaid);
    return new Response(JSON.stringify({ ok: true, invoice, payments, total_paid: totalPaid, balance }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Get invoice error:', e);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
};
