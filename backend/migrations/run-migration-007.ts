import db from '../src/config/database';
import fs from 'fs';
import path from 'path';

async function runMigration007() {
  console.log('🔄 Running Migration 007: Metrics tables...');

  const client = await db.pool.connect();

  try {
    const migrationName = '007_metrics_tables';
    const checkResult = await client.query(
      'SELECT id FROM migration_history WHERE migration_name = $1',
      [migrationName]
    );

    if (checkResult.rows.length > 0) {
      console.log(`✅ Migration ${migrationName} already applied, skipping`);
      return;
    }

    const migrationPath = path.join(__dirname, '007_metrics_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    await client.query('BEGIN');
    await client.query(migrationSQL);
    await client.query(
      'INSERT INTO migration_history (migration_name) VALUES ($1)',
      [migrationName]
    );
    await client.query('COMMIT');

    console.log('✅ Migration 007 completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration 007 failed:', error);
    throw error;
  } finally {
    client.release();
    await db.pool.end();
  }
}

runMigration007().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
