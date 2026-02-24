/**
 * ingest-test-records.ts
 *
 * Ingests test records from frontend/public/tests_dataset.json into test_records,
 * linking to encounters (lab_no = Lab_Number). Run sync-encounters.ts first.
 * Safe to run repeatedly (upsert by encounter_id + test_name).
 */

import { query } from '../../src/config/database';
import * as fs from 'fs';
import * as path from 'path';

const PUBLIC_DIR = path.join(__dirname, '../../../frontend/public');
const TESTS_DATASET_JSON_PATH = path.join(PUBLIC_DIR, 'tests_dataset.json');

interface TestJsonRecord {
  ID?: string;
  Lab_Number: string;
  Test_Name: string;
  Lab_Section: string;
  TAT: number;
  Price: number;
  Time_Received: string;
  Test_Time_Expected?: string;
  Urgency?: string;
  Test_Time_Out: string;
}

function parseDateTimeField(dtStr: string | null | undefined): Date | null {
  if (!dtStr || dtStr === 'N/A' || dtStr === '1970-01-01 00:00:00') return null;
  try {
    const dt = new Date(dtStr);
    if (isNaN(dt.getTime()) || dt.getFullYear() === 1970) return null;
    return dt;
  } catch {
    return null;
  }
}

function computeActualTatMinutes(timeIn: Date, timeOut: Date): number | null {
  const diff = timeOut.getTime() - timeIn.getTime();
  if (diff < 0) return null;
  return Math.round(diff / 60000);
}

/** Truncate string to max length to fit VARCHAR columns. Prevents "value too long" errors. */
function truncate(s: string | null | undefined, maxLen: number): string | null {
  if (s == null) return null;
  const str = String(s);
  return str.length <= maxLen ? str : str.slice(0, maxLen);
}

export interface TestJsonRecordExport {
  ID?: string;
  Lab_Number: string;
  Test_Name: string;
  Lab_Section: string;
  TAT: number;
  Price: number;
  Time_Received: string;
  Test_Time_Expected?: string;
  Urgency?: string;
  Test_Time_Out: string;
}

/**
 * Ingest test records from in-memory array. Used by the in-memory pipeline.
 */
export async function ingestTestRecordsFromMemory(data: TestJsonRecordExport[]): Promise<void> {
  if (data.length === 0) {
    console.log('ℹ️  No test records to ingest.');
    return;
  }
  console.log(`📊 Ingesting ${data.length} test records from memory...`);
  await runIngestTestRecords(data);
}

async function runIngestTestRecords(data: TestJsonRecordExport[]) {

  let inserted = 0;
  let updated = 0;
  let skippedNoEncounter = 0;
  let skippedNoMetadata = 0;
  let errors = 0;

  const batchSize = 500;
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    for (const row of batch) {
      try {
        const labNo = String(row.Lab_Number ?? '').slice(0, 50);
        const testName = String(row.Test_Name ?? '').slice(0, 255);
        const labSection = truncate(row.Lab_Section, 100);

        const encounterResult = await query(
          'SELECT lab_no, encounter_date, invoice_no, source, time_in, shift, laboratory FROM encounters WHERE lab_no = $1',
          [labNo]
        );
        if (encounterResult.rows.length === 0) {
          skippedNoEncounter++;
          continue;
        }
        const enc = encounterResult.rows[0] as {
          lab_no: string;
          encounter_date: Date;
          invoice_no: string;
          source: string;
          time_in: Date | null;
          shift: string;
          laboratory: string;
        };

        const encSource = truncate(enc.source, 100);
        const encShift = truncate(enc.shift, 20);
        const encLab = truncate(enc.laboratory, 50);
        const encInvoiceNo = truncate(enc.invoice_no, 50);
        const encLabNo = truncate(enc.lab_no, 50);

        if (!testName) {
          skippedNoMetadata++;
          continue;
        }

        let metadataResult = await query(
          'SELECT id FROM test_metadata WHERE test_name = $1',
          [testName]
        );
        if (metadataResult.rows.length === 0) {
          await query(
            `INSERT INTO test_metadata (test_name, current_price, current_tat, current_lab_section, is_default)
             VALUES ($1, $2, $3, $4, true)
             ON CONFLICT (test_name) DO NOTHING`,
            [testName, row.Price ?? 0, row.TAT ?? 1440, (labSection != null ? labSection : 'PENDING').slice(0, 100)]
          );
          metadataResult = await query(
            'SELECT id FROM test_metadata WHERE test_name = $1',
            [testName]
          );
        }
        if (metadataResult.rows.length === 0) {
          skippedNoMetadata++;
          continue;
        }
        const testMetadataId = (metadataResult.rows[0] as { id: number }).id;

        const timeIn = parseDateTimeField(row.Time_Received) ?? enc.time_in;
        const timeOut = parseDateTimeField(row.Test_Time_Out);
        const actualTat = timeIn && timeOut ? computeActualTatMinutes(timeIn, timeOut) : null;
        const isUrgent = (row.Urgency || '').toLowerCase().includes('urgent');

        const result = await query(
          `INSERT INTO test_records
           (encounter_id, test_name, test_metadata_id,
            price_at_test, tat_at_test, lab_section_at_test,
            is_urgent, is_received, is_resulted, is_cancelled,
            time_in, time_out, actual_tat,
            encounter_date, invoice_no, lab_no, source, shift, laboratory)
           VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, false, $9, $10, $11, $12, $13, $14, $15, $16, $17)
           ON CONFLICT (encounter_id, test_name)
           DO UPDATE SET
             price_at_test = EXCLUDED.price_at_test,
             tat_at_test = EXCLUDED.tat_at_test,
             lab_section_at_test = EXCLUDED.lab_section_at_test,
             time_in = EXCLUDED.time_in,
             time_out = EXCLUDED.time_out,
             actual_tat = EXCLUDED.actual_tat,
             updated_at = CURRENT_TIMESTAMP
           RETURNING (xmax = 0) AS inserted`,
          [
            labNo,
            testName,
            testMetadataId,
            row.Price ?? null,
            row.TAT ?? null,
            labSection,
            isUrgent,
            !!timeOut,
            timeIn,
            timeOut,
            actualTat,
            enc.encounter_date,
            encInvoiceNo,
            encLabNo,
            encSource,
            encShift,
            encLab,
          ]
        );

        if ((result.rows[0] as { inserted: boolean }).inserted) inserted++;
        else updated++;
      } catch (err) {
        errors++;
        if (errors <= 5) console.error('Error processing row:', row.Lab_Number, row.Test_Name, err);
      }
    }
    if ((i + batchSize) % 5000 === 0 || i + batchSize >= data.length) {
      console.log(`   Processed ${Math.min(i + batchSize, data.length)} / ${data.length}`);
    }
  }

  console.log(`
✅ Test records ingest complete:
   Inserted: ${inserted}
   Updated: ${updated}
   Skipped (no encounter): ${skippedNoEncounter}
   Skipped (no metadata): ${skippedNoMetadata}
   Errors: ${errors}`);
}

async function ingestTestRecords() {
  if (!fs.existsSync(TESTS_DATASET_JSON_PATH)) {
    console.error(`❌ File not found: ${TESTS_DATASET_JSON_PATH}`);
    console.log('   Run: npm run transform:full (to generate tests_dataset.json)');
    process.exit(1);
  }

  const raw = fs.readFileSync(TESTS_DATASET_JSON_PATH, 'utf-8');
  const data: TestJsonRecord[] = JSON.parse(raw);
  console.log(`📊 Found ${data.length} test records in tests_dataset.json`);
  await runIngestTestRecords(data);
}

if (require.main === module) {
  ingestTestRecords()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Ingest failed:', err);
      process.exit(1);
    });
}

export default ingestTestRecords;
