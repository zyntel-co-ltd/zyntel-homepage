import { neon } from '@neondatabase/serverless';

const sql = neon(import.meta.env.DATABASE_URL ?? '');

export async function insertLead(email: string, name?: string, source = 'newsletter') {
  if (!import.meta.env.DATABASE_URL) return;
  await sql`INSERT INTO leads (email, name, source) VALUES (${email}, ${name ?? null}, ${source})`;
}

export async function insertContactSubmission(email: string, name?: string, message?: string) {
  if (!import.meta.env.DATABASE_URL) return;
  await sql`INSERT INTO contact_submissions (email, name, message) VALUES (${email}, ${name ?? null}, ${message ?? null})`;
}

export async function insertPaymentEvent(data: {
  tx_ref: string;
  flw_ref?: string;
  amount: number;
  currency: string;
  status: string;
  customer_email?: string;
  meta?: Record<string, unknown>;
}) {
  if (!import.meta.env.DATABASE_URL) return;
  await sql`INSERT INTO payment_events (tx_ref, flw_ref, amount, currency, status, customer_email, meta)
    VALUES (${data.tx_ref}, ${data.flw_ref ?? null}, ${data.amount}, ${data.currency}, ${data.status}, ${data.customer_email ?? null}, ${JSON.stringify(data.meta ?? {})})`;
}
