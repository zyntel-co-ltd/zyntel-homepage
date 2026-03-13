import type { APIRoute } from 'astro';
import { createPaymentAccount } from '../../../lib/db';

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
    const { name, bank_name, account_number, account_name, bank_address, swift_code, instructions } = body ?? {};
    if (!name?.trim() || !bank_name?.trim() || !account_number?.trim() || !account_name?.trim()) {
      return new Response(JSON.stringify({ error: 'name, bank_name, account_number, account_name required' }), { status: 400 });
    }
    const account = await createPaymentAccount({
      name: String(name).trim(),
      bank_name: String(bank_name).trim(),
      account_number: String(account_number).trim(),
      account_name: String(account_name).trim(),
      bank_address: bank_address ? String(bank_address).trim() : undefined,
      swift_code: swift_code ? String(swift_code).trim() : undefined,
      instructions: instructions ? String(instructions).trim() : undefined,
    });
    if (!account) {
      return new Response(JSON.stringify({ error: 'Database error' }), { status: 500 });
    }
    return new Response(JSON.stringify({ ok: true, account }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Create payment account error:', e);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
};
