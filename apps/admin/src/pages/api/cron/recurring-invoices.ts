import type { APIRoute } from 'astro';
import { getRecurringInvoicesDue, processRecurringInvoice } from '@zyntel/db';

export const GET: APIRoute = async ({ request }) => {
  const authHeader = request.headers.get('authorization');
  const cronSecret = import.meta.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  try {
    const due = await getRecurringInvoicesDue();
    const created: { id: number; invoice_number: string }[] = [];
    for (const inv of due) {
      const newInv = await processRecurringInvoice(inv);
      if (newInv) {
        created.push({ id: newInv.id, invoice_number: newInv.invoice_number });
      }
    }
    return new Response(
      JSON.stringify({ ok: true, processed: due.length, created }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('Recurring invoices cron error:', e);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
};
