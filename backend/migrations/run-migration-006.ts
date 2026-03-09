import db from '../src/config/database';
import fs from 'fs';
import path from 'path';

async function runMigration006() {
  console.log('🔄 Running Migration 006: Invoice no nullable + Staff tracking...');

  const client = await db.pool.connect();

  try {
    const migrationName = '006_invoice_no_nullable_and_staff_tracking';
    const checkResult = await client.query(
      'SELECT id FROM migration_history WHERE migration_name = $1',
      [migrationName]
    );

    if (checkResult.rows.length > 0) {
      console.log(`✅ Migration ${migrationName} already applied, skipping`);
      return;
    }

    const migrationPath = path.join(__dirname, '006_invoice_no_nullable_and_staff_tracking.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    await client.query('BEGIN');
    await client.query(migrationSQL);
    await client.query(
      'INSERT INTO migration_history (migration_name) VALUES ($1)',
      [migrationName]
    );
    await client.query('COMMIT');

    console.log('✅ Migration 006 completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration 006 failed:', error);
    throw error;
  } finally {
    client.release();
    await db.pool.end();
  }
}

runMigration006().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
