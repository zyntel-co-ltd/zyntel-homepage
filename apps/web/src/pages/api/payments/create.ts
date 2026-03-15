import type { APIRoute } from 'astro';

const FLW_API = 'https://api.flutterwave.com/v3/payments';

export const POST: APIRoute = async ({ request }) => {
  if (request.headers.get('content-type') !== 'application/json') {
    return new Response(JSON.stringify({ error: 'Expect JSON' }), { status: 400 });
  }
  const secretKey = import.meta.env.FLW_SECRET_KEY;
  if (!secretKey) {
    return new Response(JSON.stringify({ error: 'Payments not configured' }), { status: 503 });
  }
  try {
    const body = await request.json();
    const { amount, currency = 'UGX', email, product_name, product_id } = body ?? {};
    const amt = Number(amount);
    if (!amt || amt <= 0 || !email) {
      return new Response(JSON.stringify({ error: 'Invalid amount or email' }), { status: 400 });
    }
    const tx_ref = `zyntel-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const site = import.meta.env.SITE ?? 'https://zyntel.net';
    const payload = {
      tx_ref,
      amount: amt,
      currency,
      redirect_url: `${site}/purchase?status=success&tx_ref=${tx_ref}`,
      customer: { email: String(email).trim() },
      customizations: {
        title: 'Zyntel',
        description: product_name ? `Payment for ${product_name}` : 'Software license payment',
      },
      meta: { product_id: product_id ?? null },
    };
    const res = await fetch(FLW_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as { status?: string; data?: { link?: string }; message?: string };
    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: data?.message ?? 'Payment creation failed' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    if (data?.status !== 'success' || !data?.data?.link) {
      return new Response(
        JSON.stringify({ error: 'No payment link returned' }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return new Response(
      JSON.stringify({ ok: true, link: data.data.link, tx_ref }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('Payment create error:', e);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
};
