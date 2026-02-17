import { query } from '../../src/config/database';

/**
 * Populate the patients table and link encounters/test_records using lab numbers.
 *
 * Strategy:
 * - Use each unique encounter lab_no as a surrogate external patient_id.
 * - Insert patients(patient_id) for all distinct lab_no values (idempotent).
 * - Set encounters.patient_id to the corresponding patients.id.
 * - Set test_records.patient_id via encounters so all tests for a lab_no link to the same patient.
 *
 * This works with the existing schema where:
 * - patients.id is the PK
 * - patients.patient_id is a UNIQUE external identifier (we reuse lab_no here)
 * - encounters.lab_no is the natural PK for an encounter/visit
 * - encounters.patient_id references patients(id)
 * - test_records.patient_id references patients(id)
 */
async function populatePatientsFromEncounters() {
  console.log('🔄 Starting patient population from encounters (using lab numbers)...');

  try {
    // 1) Ensure a patient row exists for every distinct lab_no in encounters
    console.log('🧬 Inserting/ensuring patients based on encounter lab numbers...');
    await query(
      `INSERT INTO patients (patient_id)
       SELECT DISTINCT lab_no::text
       FROM encounters
       WHERE lab_no IS NOT NULL
       ON CONFLICT (patient_id) DO NOTHING`
    );

    // 2) Link encounters to patients via patient_id (string) -> id (int)
    console.log('🔗 Linking encounters to patients...');
    const updateEncountersResult = await query(
      `UPDATE encounters e
       SET patient_id = p.id
       FROM patients p
       WHERE p.patient_id = e.lab_no::text
         AND (e.patient_id IS NULL OR e.patient_id <> p.id)`
    );

    console.log(`✅ Updated ${updateEncountersResult.rowCount} encounters with patient_id.`);

    // 3) Propagate patient_id to test_records via encounters
    console.log('📎 Linking test_records to patients via encounters...');
    const updateTestsResult = await query(
      `UPDATE test_records tr
       SET patient_id = e.patient_id
       FROM encounters e
       WHERE tr.encounter_id = e.lab_no
         AND e.patient_id IS NOT NULL
         AND (tr.patient_id IS NULL OR tr.patient_id <> e.patient_id)`
    );

    console.log(`✅ Updated ${updateTestsResult.rowCount} test_records with patient_id.`);

    console.log('🎉 Patient population from encounters completed successfully.');
  } catch (error) {
    console.error('❌ Failed to populate patients from encounters:', error);
    process.exitCode = 1;
  }
}

// Run if called directly
if (require.main === module) {
  populatePatientsFromEncounters()
    .then(() => {
      console.log('✅ populatePatientsFromEncounters script finished.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ populatePatientsFromEncounters script failed:', error);
      process.exit(1);
    });
}

export default populatePatientsFromEncounters;

