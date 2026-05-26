import type { APIRoute } from 'astro';
import { sql } from '@zyntel/db';

export const POST: APIRoute = async ({ request }) => {
  const apiKey = request.headers.get('x-api-key') ?? request.headers.get('authorization')?.replace('Bearer ', '');
  const expectedKey = import.meta.env.INVOICE_API_KEY;
  if (expectedKey && apiKey !== expectedKey) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    await sql`
      ALTER TABLE clients
        ADD COLUMN IF NOT EXISTS pdf_header_name TEXT,
        ADD COLUMN IF NOT EXISTS pdf_footer_text TEXT
    `;
    return new Response(JSON.stringify({ ok: true, message: 'Migration 020 applied: pdf_header_name, pdf_footer_text columns added to clients.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('Migration error:', e);
    return new Response(JSON.stringify({ error: e?.message ?? 'Migration failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
