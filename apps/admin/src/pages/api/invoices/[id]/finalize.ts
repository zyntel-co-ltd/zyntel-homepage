import type { APIRoute } from 'astro';
import { getInvoice, updateInvoiceStatus } from '@zyntel/db';

export const POST: APIRoute = async ({ params, request }) => {
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
    if (invoice.status !== 'draft') {
      return new Response(JSON.stringify({ error: 'Invoice is already finalized' }), { status: 400 });
    }
    await updateInvoiceStatus(id, 'sent');
    const updated = await getInvoice(id);
    return new Response(JSON.stringify({ ok: true, invoice: updated }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Finalize invoice error:', e);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
};
