import fs from 'fs/promises';
import path from 'path';
import { query, transaction } from '../../src/config/database';
import { extractTimeFromLabNo, determineShift, determineLaboratory } from '../../src/utils/dateUtils';
import moment from 'moment';

interface DataJsonRecord {
  EncounterDate: string;
  InvoiceNo: string;
  LabNo: string;
  Src: string;
  TestName: string;
}

const PUBLIC_DIR = path.join(__dirname, '../../..', 'frontend', 'public');

async function ingestData() {
  console.log('🔄 Starting data ingestion...');

  try {
    // Read data.json
    const dataJsonPath = path.join(PUBLIC_DIR, 'data.json');
    const dataJsonContent = await fs.readFile(dataJsonPath, 'utf-8');
    const dataJson: DataJsonRecord[] = JSON.parse(dataJsonContent);

    console.log(`📊 Found ${dataJson.length} records in data.json`);

    // PHASE 1: Extract and insert unique encounters
    console.log('📝 Phase 1: Processing unique encounters...');
    const encountersMap = new Map<string, DataJsonRecord>();

    for (const record of dataJson) {
      if (!encountersMap.has(record.LabNo)) {
        encountersMap.set(record.LabNo, record);
      }
    }

    console.log(`🏥 Found ${encountersMap.size} unique encounters (lab numbers)`);

    let encountersInserted = 0;
    let encountersUpdated = 0;

    for (const [labNo, record] of encountersMap) {
      try {
        const encounterDate = moment(record.EncounterDate, 'YYYY-MM-DD').toDate();
        const timeIn = extractTimeFromLabNo(record.LabNo);

        if (!timeIn) {
          console.warn(`⚠️  Invalid lab number format: ${record.LabNo}`);
          continue;
        }

        const shift = determineShift(timeIn);
        const laboratory = determineLaboratory(record.Src);

        const result = await query(
          `INSERT INTO encounters (lab_no, invoice_no, encounter_date, source, time_in, shift, laboratory)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (lab_no)
           DO UPDATE SET
             invoice_no = EXCLUDED.invoice_no,
             encounter_date = EXCLUDED.encounter_date,
             source = EXCLUDED.source,
             time_in = EXCLUDED.time_in,
             shift = EXCLUDED.shift,
             laboratory = EXCLUDED.laboratory,
             updated_at = CURRENT_TIMESTAMP
           RETURNING (xmax = 0) AS inserted`,
          [labNo, record.InvoiceNo, encounterDate, record.Src, timeIn, shift, laboratory]
        );

        if (result.rows[0].inserted) {
          encountersInserted++;
        } else {
          encountersUpdated++;
        }
      } catch (error) {
        console.error(`❌ Error processing encounter:`, labNo, error);
      }
    }

    console.log(`✅ Phase 1 complete: ${encountersInserted} encounters inserted, ${encountersUpdated} updated`);

    // PHASE 2: Insert test records (only for tests that exist in test_metadata)
    // Tests not in test_metadata are logged to unmatched_tests for admins to add via Meta table
    console.log('📝 Phase 2: Processing test records...');

    // Track unmatched tests
    const unmatchedTests: string[] = [];

    // Insert/update test records
    let insertedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    for (const record of dataJson) {
      try {
        // Get metadata - only tests in test_metadata (from meta.csv or Meta table) are processed
        const metadataResult = await query(
          'SELECT * FROM test_metadata WHERE test_name = $1',
          [record.TestName]
        );

        if (metadataResult.rows.length === 0) {
          unmatchedTests.push(record.TestName);
          continue;
        }

        const metadata = metadataResult.rows[0];

        // Get historical price at encounter date
        // CRITICAL FIX: Use metadata values directly if no history found
        let priceAtTest = metadata.current_price;
        let tatAtTest = metadata.current_tat;
        let labSectionAtTest = metadata.current_lab_section;

        // Check if there's a historical price for this date
        const encounterDate = moment(record.EncounterDate, 'YYYY-MM-DD').toDate();
        const historyResult = await query(
          `SELECT price, tat, lab_section 
           FROM test_metadata_history 
           WHERE test_metadata_id = $1 
           AND effective_from <= $2 
           AND (effective_to IS NULL OR effective_to > $2)
           ORDER BY effective_from DESC 
           LIMIT 1`,
          [metadata.id, encounterDate]
        );

        if (historyResult.rows.length > 0) {
          priceAtTest = historyResult.rows[0].price;
          tatAtTest = historyResult.rows[0].tat;
          labSectionAtTest = historyResult.rows[0].lab_section;
        }

        // Verify encounter exists (should already be created in Phase 1)
        const encounterCheck = await query(
          'SELECT lab_no FROM encounters WHERE lab_no = $1',
          [record.LabNo]
        );

        if (encounterCheck.rows.length === 0) {
          console.warn(`⚠️  No encounter found for lab_no: ${record.LabNo}`);
          errorCount++;
          continue;
        }

        // Insert or update test record with encounter_id FK
        const timeIn = extractTimeFromLabNo(record.LabNo);
        const result = await query(
          `INSERT INTO test_records
           (encounter_id, test_name, test_metadata_id,
            price_at_test, tat_at_test, lab_section_at_test,
            encounter_date, invoice_no, lab_no, source, time_in, shift, laboratory)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
           ON CONFLICT (encounter_id, test_name)
           DO UPDATE SET
             price_at_test = EXCLUDED.price_at_test,
             tat_at_test = EXCLUDED.tat_at_test,
             lab_section_at_test = EXCLUDED.lab_section_at_test,
             updated_at = CURRENT_TIMESTAMP
           RETURNING (xmax = 0) AS inserted`,
          [
            record.LabNo,  // encounter_id (FK to encounters.lab_no)
            record.TestName,
            metadata.id,
            priceAtTest,
            tatAtTest,
            labSectionAtTest,
            // Deprecated columns (kept for backward compatibility)
            moment(record.EncounterDate, 'YYYY-MM-DD').toDate(),
            record.InvoiceNo,
            record.LabNo,
            record.Src,
            timeIn,
            determineShift(timeIn),
            determineLaboratory(record.Src),
          ]
        );

        if (result.rows[0].inserted) {
          insertedCount++;
        } else {
          updatedCount++;
        }
      } catch (error) {
        console.error(`Error processing record:`, record, error);
        errorCount++;
      }
    }

    // Log unmatched tests (tests with no matching metadata - add via Admin > Unmatched tab or Meta table)
    const sourceMap = new Map<string, string>();
    for (const record of dataJson) {
      if (unmatchedTests.includes(record.TestName)) {
        const src = (record.Src || 'labguru').toLowerCase();
        sourceMap.set(record.TestName, src);
      }
    }
    for (const testName of [...new Set(unmatchedTests)]) {
      const source = (sourceMap.get(testName) || 'labguru').substring(0, 50);
      const safeTestName = testName.substring(0, 255);
      await query(
        `INSERT INTO unmatched_tests (test_name, source, occurrence_count) 
         VALUES ($1, $2, 1)
         ON CONFLICT (test_name, source) 
         DO UPDATE SET 
           occurrence_count = unmatched_tests.occurrence_count + 1,
           last_seen = CURRENT_TIMESTAMP`,
        [safeTestName, source]
      );
    }

    console.log(`✅ Phase 2 complete: Test records processed`);
    console.log(`
📊 Data Ingestion Summary:
   Encounters:
   - Inserted: ${encountersInserted}
   - Updated: ${encountersUpdated}

   Test Records:
   - Inserted: ${insertedCount}
   - Updated: ${updatedCount}
   - Errors: ${errorCount}
   - Unmatched tests: ${unmatchedTests.length}

   Total unique encounters: ${encountersMap.size}
   Total test records: ${dataJson.length}`);

  } catch (error) {
    console.error('❌ Data ingestion failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  ingestData()
    .then(() => {
      console.log('✅ Ingestion complete');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Ingestion failed:', error);
      process.exit(1);
    });
}

export default ingestData;