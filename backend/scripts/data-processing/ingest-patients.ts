/**
 * ingest-patients.ts - TypeScript port of Flask's ingest.py
 * 
 * Ingests transformed data from patients_dataset.json into the patients table.
 * This is the React equivalent of Flask's ingest.py but simplified since we
 * only have the patients table (no separate encounters/tests tables like the
 * old migration 002 tried to create).
 * 
 * Note: This expects transform.ts to have already run and generated:
 * - patients_dataset.json
 * - tests_dataset.json (not used yet, but generated for future use)
 */

import { query } from '../../src/config/database';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// ============================================================================
// INTERFACES
// ============================================================================

interface PatientRecord {
  Lab_Number: string;
  Client: string;
  Date: string;
  Shift: string;
  Unit: string;
  Time_In: string;
  Daily_TAT: number;
  Request_Time_Expected: string;
  Request_Time_Out: string;
  Request_Delay_Status: string;
  Request_Time_Range: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const PUBLIC_DIR = path.join(__dirname, '../../../frontend/public');
const PATIENTS_DATASET_JSON_PATH = path.join(PUBLIC_DIR, 'patients_dataset.json');
const TESTS_DATASET_JSON_PATH = path.join(PUBLIC_DIR, 'tests_dataset.json');

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parses datetime string to Date object
 * Returns null for invalid/default timestamps
 */
function parseDateTimeField(dtStr: string | null | undefined): Date | null {
  if (!dtStr || dtStr === 'N/A' || dtStr === '1970-01-01 00:00:00') {
    return null;
  }

  try {
    const dt = new Date(dtStr);
    if (isNaN(dt.getTime()) || dt.getFullYear() === 1970) {
      return null;
    }
    return dt;
  } catch (error) {
    console.warn(`Unable to parse datetime string '${dtStr}':`, error);
    return null;
  }
}

/**
 * Ingests patient records in batches using INSERT ... ON CONFLICT DO UPDATE.
 * Exported for use by the in-memory pipeline.
 */
export async function ingestPatientsData(data: PatientRecord[], batchSize: number = 1000) {
  if (data.length === 0) {
    console.log('ℹ️  No new patient records to ingest.');
    return { inserted: 0, updated: 0, errors: 0 };
  }

  console.log(`📥 Ingesting ${data.length} patient records in batches of ${batchSize}...`);

  let inserted = 0;
  let updated = 0;
  let errors = 0;

  // Process in batches
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    
    try {
      // Build batch insert query
      const values: any[] = [];
      const placeholders: string[] = [];
      let paramIndex = 1;

      for (const record of batch) {
        const date = parseDateTimeField(record.Date);
        const timeIn = parseDateTimeField(record.Time_In);
        const requestTimeExpected = parseDateTimeField(record.Request_Time_Expected);
        const requestTimeOut = parseDateTimeField(record.Request_Time_Out);

        if (!date) {
          console.warn(`⚠️  Skipping ${record.Lab_Number}: invalid date`);
          errors++;
          continue;
        }

        placeholders.push(
          `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, ` +
          `$${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, ` +
          `$${paramIndex + 8}, $${paramIndex + 9}, $${paramIndex + 10})`
        );

        values.push(
          record.Lab_Number,
          record.Client || null,
          date,
          record.Shift || null,
          record.Unit || null,
          timeIn,
          record.Daily_TAT || null,
          requestTimeExpected,
          requestTimeOut,
          record.Request_Delay_Status || null,
          record.Request_Time_Range || null
        );

        paramIndex += 11;
      }

      if (placeholders.length === 0) {
        continue; // All records in this batch were invalid
      }

      const insertQuery = `
        INSERT INTO patients (
          lab_number, client, date, shift, unit,
          time_in, daily_tat, request_time_expected, request_time_out,
          request_delay_status, request_time_range
        ) VALUES ${placeholders.join(', ')}
        ON CONFLICT (lab_number) DO UPDATE SET
          client = EXCLUDED.client,
          date = EXCLUDED.date,
          shift = EXCLUDED.shift,
          unit = EXCLUDED.unit,
          time_in = EXCLUDED.time_in,
          daily_tat = EXCLUDED.daily_tat,
          request_time_expected = EXCLUDED.request_time_expected,
          request_time_out = EXCLUDED.request_time_out,
          request_delay_status = EXCLUDED.request_delay_status,
          request_time_range = EXCLUDED.request_time_range
        RETURNING (xmax = 0) AS inserted
      `;

      const result = await query(insertQuery, values);

      // Count inserts vs updates
      for (const row of result.rows) {
        if (row.inserted) {
          inserted++;
        } else {
          updated++;
        }
      }

      console.log(`⏳ Processed ${i + batch.length}/${data.length} records...`);

    } catch (error) {
      console.error(`❌ Error processing batch starting at index ${i}:`, error);
      errors += batch.length;
    }
  }

  return { inserted, updated, errors };
}

/**
 * Gets existing lab numbers from database
 */
async function getExistingLabNumbers(): Promise<Set<string>> {
  try {
    const result = await query('SELECT lab_number FROM patients');
    return new Set(result.rows.map((row: any) => row.lab_number));
  } catch (error) {
    console.error('❌ Error querying existing lab numbers:', error);
    return new Set();
  }
}

// ============================================================================
// MAIN INGESTION LOGIC
// ============================================================================

async function runDataIngestion() {
  console.log('🔄 Starting data ingestion into patients table...');

  try {
    // Run timeout update first (as in Flask app: fetch -> timeout -> then use data)
    try {
      const timeoutScript = path.join(__dirname, 'timeout.py');
      const publicDir = path.resolve(__dirname, '../../../frontend/public');
      if (fs.existsSync(timeoutScript)) {
        console.log('⏱️  Running timeout script (Z: drive / TimeOut.csv)...');
        execSync(`py -3.11 "${timeoutScript}"`, {
          stdio: 'inherit',
          cwd: path.dirname(timeoutScript),
          env: { ...process.env, PUBLIC_DIR: publicDir },
        });
      }
    } catch (timeoutErr: any) {
      console.warn('⚠️  Timeout script skipped or failed (non-fatal):', timeoutErr?.message || timeoutErr);
    }

    // Check if patients_dataset.json exists
    if (!fs.existsSync(PATIENTS_DATASET_JSON_PATH)) {
      console.error('❌ patients_dataset.json not found!');
      console.log('ℹ️  Please run transform.ts first to generate the dataset.');
      process.exit(1);
    }

    // Load patients data
    console.log(`📖 Loading patients_dataset.json...`);
    const patientsData: PatientRecord[] = JSON.parse(
      fs.readFileSync(PATIENTS_DATASET_JSON_PATH, 'utf-8')
    );
    console.log(`📊 Found ${patientsData.length} patient records`);
    await ingestPatientsFromMemory(patientsData);
    const finalCount = await query('SELECT COUNT(*) as count FROM patients');
    console.log(`📈 Total patients in database: ${finalCount.rows[0].count}`);
  } catch (error) {
    console.error('❌ Data ingestion failed:', error);
    throw error;
  }
}

/**
 * Ingest patient records from in-memory array. Used by the in-memory pipeline.
 */
export async function ingestPatientsFromMemory(patientsData: PatientRecord[]): Promise<void> {
  try {
    console.log(`📊 Ingesting ${patientsData.length} patient records...`);
    const existingLabNos = await getExistingLabNumbers();
    console.log(`ℹ️  Current patients in database: ${existingLabNos.size}`);
    const stats = await ingestPatientsData(patientsData);
    console.log('✅ Patients ingestion completed.');
    console.log(`   Inserted: ${stats.inserted}, Updated: ${stats.updated}, Errors: ${stats.errors}`);
  } catch (error) {
    console.error('❌ Patients ingestion failed:', error);
    throw error;
  }
}

// ============================================================================
// ENTRY POINT
// ============================================================================

if (require.main === module) {
  runDataIngestion()
    .then(() => {
      console.log('\n✅ Ingest script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Ingest script failed:', error);
      process.exit(1);
    });
}

export { runDataIngestion };
