import db from '../src/config/database';
import fs from 'fs';
import path from 'path';

async function runMigration004() {
  console.log('🔄 Running Migration 004: Fix Patients Table Schema...');

  const client = await db.pool.connect();

  try {
    // Check if migration has already been run
    const migrationName = '004_fix_patients_schema';
    const checkResult = await client.query(
      'SELECT id FROM migration_history WHERE migration_name = $1',
      [migrationName]
    );

    if (checkResult.rows.length > 0) {
      console.log(`✅ Migration ${migrationName} already applied, skipping`);
      return;
    }

    // Read and execute the migration
    const migrationPath = path.join(__dirname, '004_fix_patients_schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    await client.query('BEGIN');
    await client.query(migrationSQL);

    // Record that we ran this migration
    await client.query(
      'INSERT INTO migration_history (migration_name) VALUES ($1)',
      [migrationName]
    );

    await client.query('COMMIT');

    console.log('✅ Migration 004 completed successfully');

    // Verification
    const patientsCount = await client.query('SELECT COUNT(*) FROM patients');
    console.log(`📊 Verification: Patients table has ${patientsCount.rows[0].count} records`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration 004 failed:', error);
    throw error;
  } finally {
    client.release();
    await db.pool.end();
  }
}

runMigration004().catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
});
