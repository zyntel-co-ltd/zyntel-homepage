import { query, pool } from '../src/config/database';

async function verifyData() {
  console.log('🔍 Verifying database schema and data integrity...\n');

  try {
    // Show which DB we're using (mask password)
    const dbUrl = process.env.DATABASE_URL || '';
    const dbName = dbUrl.replace(/^[^@]+@/, '').split('/').pop()?.split('?')[0] || 'unknown';
    console.log(`📌 Database: ${dbName}\n`);

    // Primary table for dashboard: patients (lab encounters)
    const patientsCount = await query('SELECT COUNT(*) as count FROM patients');
    const patientsTotal = parseInt(patientsCount.rows[0].count as string);

    console.log('📊 Table Counts (dashboard uses \'patients\'):');
    console.log(`   Patients (lab encounters): ${patientsTotal}  ← main data for Performance / Progress / LRIDS`);
    if (patientsTotal === 0) {
      console.log('\n   ⚠️  No patient data. Run: npm run transform:full && npm run ingest');
    }

    const encountersCount = await query('SELECT COUNT(*) as count FROM encounters');
    const testRecordsCount = await query('SELECT COUNT(*) as count FROM test_records');
    const testMetadataCount = await query('SELECT COUNT(*) as count FROM test_metadata');
    const timeoutRecordsCount = await query('SELECT COUNT(*) as count FROM timeout_records');
    const unmatchedTestsCount = await query('SELECT COUNT(*) as count FROM unmatched_tests');

    console.log(`   Encounters: ${encountersCount.rows[0].count}`);
    console.log(`   Test Records: ${testRecordsCount.rows[0].count}`);
    console.log(`   Test Metadata: ${testMetadataCount.rows[0].count}`);
    console.log(`   Timeout Records: ${timeoutRecordsCount.rows[0].count}`);
    console.log(`   Unmatched Tests: ${unmatchedTestsCount.rows[0].count}`);

    // Check for data integrity
    console.log('\n🔗 Data Integrity Checks:');

    // Check for duplicate lab_no in encounters
    const duplicateLabNo = await query(
      `SELECT lab_no, COUNT(*) as count
       FROM encounters
       GROUP BY lab_no
       HAVING COUNT(*) > 1`
    );
    if (duplicateLabNo.rows.length > 0) {
      console.log(`   ❌ Found ${duplicateLabNo.rows.length} duplicate lab_no in encounters table:`);
      duplicateLabNo.rows.forEach(row => {
        console.log(`      - ${row.lab_no} (${row.count} times)`);
      });
    } else {
      console.log(`   ✅ No duplicate lab_no in encounters table`);
    }

    // Check for orphaned test_records (encounter_id not in encounters)
    const orphanedTests = await query(
      `SELECT COUNT(*) as count
       FROM test_records
       WHERE encounter_id IS NOT NULL
       AND encounter_id NOT IN (SELECT lab_no FROM encounters)`
    );
    if (parseInt(orphanedTests.rows[0].count) > 0) {
      console.log(`   ❌ Found ${orphanedTests.rows[0].count} orphaned test records (encounter_id not in encounters)`);
    } else {
      console.log(`   ✅ All test records have valid encounter_id foreign keys`);
    }

    // Check for tests without metadata
    const testsWithoutMetadata = await query(
      `SELECT COUNT(*) as count
       FROM test_records
       WHERE test_metadata_id IS NULL`
    );
    if (parseInt(testsWithoutMetadata.rows[0].count) > 0) {
      console.log(`   ⚠️  Found ${testsWithoutMetadata.rows[0].count} test records without metadata`);
    } else {
      console.log(`   ✅ All test records have metadata`);
    }

    // Show sample data
    console.log('\n📝 Sample Data:');

    if (patientsTotal > 0) {
      const samplePatients = await query(
        `SELECT lab_number, date, shift, unit, time_in, daily_tat, request_delay_status
         FROM patients ORDER BY date DESC, time_in DESC NULLS LAST LIMIT 3`
      );
      console.log('\n   Sample Patients (lab encounters):');
      samplePatients.rows.forEach((row: any) => {
        const d = row.date ? new Date(row.date) : null;
        const dateStr = d && !isNaN(d.getTime()) ? d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
        const timeIn = row.time_in ? new Date(row.time_in).toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'N/A';
        const tatStr = row.daily_tat != null ? `${row.daily_tat}min` : 'N/A';
        console.log(`   - Lab: ${row.lab_number}, Date: ${dateStr}, Time In: ${timeIn}, Shift: ${row.shift}, Unit: ${row.unit}, TAT: ${tatStr}, Status: ${row.request_delay_status}`);
      });
    }

    const sampleEncounters = await query('SELECT * FROM encounters LIMIT 3');
    console.log('\n   Sample Encounters:');
    if (sampleEncounters.rows.length > 0) {
      sampleEncounters.rows.forEach((row: any) => {
        console.log(`   - Lab: ${row.lab_no}, Invoice: ${row.invoice_no}, Date: ${row.encounter_date}, Source: ${row.source}`);
      });
    } else {
      console.log('   (none; dashboard uses patients table)');
    }

    const sampleTests = await query(
      `SELECT tr.*, e.invoice_no, e.encounter_date
       FROM test_records tr
       JOIN encounters e ON tr.encounter_id = e.lab_no
       LIMIT 3`
    );
    console.log('\n   Sample Test Records (with encounter data):');
    if (sampleTests.rows.length > 0) {
      sampleTests.rows.forEach((row: any) => {
        console.log(`   - Test: ${row.test_name}, Lab: ${row.encounter_id}, Invoice: ${row.invoice_no}, Date: ${row.encounter_date}`);
      });
    } else {
      console.log('   (none; dashboard uses patients table)');
    }

    // Check for tests with time_out
    const testsWithTimeout = await query(
      'SELECT COUNT(*) as count FROM test_records WHERE time_out IS NOT NULL'
    );
    const totalTests = parseInt(testRecordsCount.rows[0].count);
    const withTimeout = parseInt(testsWithTimeout.rows[0].count);
    const timeoutPercentage = totalTests > 0 ? ((withTimeout / totalTests) * 100).toFixed(1) : '0';

    console.log(`\n⏱️  Timeout Status:`);
    console.log(`   Tests with time_out: ${withTimeout} / ${totalTests} (${timeoutPercentage}%)`);

    // Summary
    console.log('\n✅ Data verification complete!');
    console.log(`\n📈 Summary:`);
    if (patientsTotal > 0) {
      console.log(`   ✅ Database has data: ${patientsTotal} patients (lab encounters) for dashboard.`);
    } else {
      console.log(`   ❌ No patient data. Run: npm run transform:full && npm run ingest`);
    }
    console.log(`   - Encounters: ${encountersCount.rows[0].count} (optional)`);
    console.log(`   - Test records: ${testRecordsCount.rows[0].count} (optional)`);
    console.log(`   - Tests with results: ${withTimeout} (${timeoutPercentage}%)`);
    console.log(`   - Data integrity: ${duplicateLabNo.rows.length === 0 && parseInt(orphanedTests.rows[0].count) === 0 ? '✅ All checks passed' : '⚠️  Issues found above'}`);

  } catch (error) {
    console.error('❌ Data verification failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  verifyData()
    .then(() => {
      console.log('\n✅ Verification complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Verification failed:', error);
      process.exit(1);
    });
}

export default verifyData;
