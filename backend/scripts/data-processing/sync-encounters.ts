/**
 * sync-encounters.ts
 *
 * Syncs the encounters table from the patients table so that Revenue, Tests,
 * Reception, and Tracker can use test_records with valid encounter_id FKs.
 * Run after ingest-patients.ts. Safe to run repeatedly (upsert by lab_no).
 */

import { query } from '../../src/config/database';

async function syncEncounters() {
  console.log('🔄 Syncing encounters from patients table...');

  const result = await query(
    `INSERT INTO encounters (lab_no, invoice_no, encounter_date, source, time_in, shift, laboratory)
     SELECT
       lab_number,
       lab_number,
       date,
       COALESCE(client, ''),
       time_in,
       COALESCE(shift, ''),
       COALESCE(unit, '')
     FROM patients
     ON CONFLICT (lab_no)
     DO UPDATE SET
       invoice_no = EXCLUDED.invoice_no,
       encounter_date = EXCLUDED.encounter_date,
       source = EXCLUDED.source,
       time_in = EXCLUDED.time_in,
       shift = EXCLUDED.shift,
       laboratory = EXCLUDED.laboratory,
       updated_at = CURRENT_TIMESTAMP`
  );

  const countResult = await query('SELECT COUNT(*) AS count FROM encounters');
  const count = parseInt((countResult.rows[0] as { count: string }).count, 10);
  console.log(`✅ Encounters synced. Total encounters: ${count}`);
}

if (require.main === module) {
  syncEncounters()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Sync failed:', err);
      process.exit(1);
    });
}

export default syncEncounters;
