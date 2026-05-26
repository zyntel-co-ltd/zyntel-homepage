import { defineMiddleware } from 'astro:middleware';
import { sql } from '@zyntel/db';

let migrationsDone = false;

async function runPendingMigrations() {
  if (migrationsDone) return;
  migrationsDone = true;
  try {
    await sql`
      ALTER TABLE clients
        ADD COLUMN IF NOT EXISTS pdf_header_name TEXT,
        ADD COLUMN IF NOT EXISTS pdf_footer_text TEXT
    `;
  } catch {
    // non-fatal — columns may already exist or DB unavailable at startup
  }
}

export const onRequest = defineMiddleware(async (_ctx, next) => {
  await runPendingMigrations();
  return next();
});
