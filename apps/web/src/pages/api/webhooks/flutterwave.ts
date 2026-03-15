import type { APIRoute } from 'astro';
import { insertPaymentEvent } from '@zyntel/db';

export const POST: APIRoute = async ({ request }) => {
  const verifyHash = import.meta.env.FLW_VERIFY_HASH;
  if (!verifyHash) {
    return new Response('Webhook not configured', { status: 503 });
  }
  const incomingHash = request.headers.get('verif-hash') ?? '';
  if (incomingHash !== verifyHash) {
    return new Response('Invalid verification hash', { status: 401 });
  }
  const raw = await request.text();
  try {
    const data = JSON.parse(raw) as {
      event?: string;
      data?: {
        tx_ref?: string;
        flw_ref?: string;
        amount?: number;
        currency?: string;
        status?: string;
        customer?: { email?: string };
        meta?: Record<string, unknown>;
      };
    };
    if (data.event === 'charge.completed' && data.data) {
      const d = data.data;
      await insertPaymentEvent({
        tx_ref: d.tx_ref ?? '',
        flw_ref: d.flw_ref,
        amount: d.amount ?? 0,
        currency: d.currency ?? 'UGX',
        status: d.status ?? 'completed',
        customer_email: d.customer?.email,
        meta: d.meta,
      });
    }
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Flutterwave webhook error:', e);
    return new Response('Error', { status: 500 });
  }
};
