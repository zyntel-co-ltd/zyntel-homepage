/**
 * In-memory data pipeline: no persistent data.json, patients_dataset.json, or tests_dataset.json.
 *
 * Flow:
 * 1. Run fetch (writes data.json)
 * 2. Run timeout (updates TimeOut.csv)
 * 3. Read data.json into memory, then delete data.json
 * 4. Transform in memory (reads meta.csv + TimeOut.csv only) -> patientsDataset, testsDataset
 * 5. Ingest encounters from rawData
 * 6. Ingest patients from patientsDataset
 * 7. Sync encounters from patients table
 * 8. Ingest test records from testsDataset
 *
 * meta.csv and TimeOut.csv remain on disk (allowed). No other intermediate files are kept.
 *
 * Deduplication: All ingest steps use upserts (ON CONFLICT DO UPDATE). Re-runs and
 * partial runs after power/network failure are safe; see docs/pipeline_deduplication_and_processed_records.txt.
 * Processed state: DB is source of truth; .last_run drives fetch start date (no data.json needed).
 */

import path from 'path';
import fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import {
  transformInMemory,
  type RawDataRecordExport,
  type PatientRecordExport,
  type TestRecordExport,
} from './transform';
import { ingestEncountersFromRawData, type DataJsonRecord } from './ingest';
import { ingestPatientsFromMemory } from './ingest-patients';
import { ingestTestRecordsFromMemory } from './ingest-test-records';
import syncEncounters from './sync-encounters';

const execAsync = promisify(exec);
const BACKEND_DIR = path.resolve(__dirname, '../..');
const PUBLIC_DIR = path.join(path.resolve(__dirname, '../../..'), 'frontend', 'public');
const DATA_JSON_PATH = path.join(PUBLIC_DIR, 'data.json');

function runInBackend(cmd: string) {
  return execAsync(cmd, { cwd: BACKEND_DIR });
}

async function main() {
  console.log('🔄 In-memory pipeline: fetch -> timeout -> transform -> ingest (no intermediate files kept)\n');

  // 1. Fetch from LIMS (still writes data.json for this run)
  console.log('📥 Step 1: Fetching from LIMS...');
  try {
    await runInBackend('npm run fetch-data');
  } catch (err: any) {
    console.error('❌ Fetch failed:', err?.message || err);
    process.exit(1);
  }

  // 2. Timeout (Z: drive -> TimeOut.csv)
  console.log('\n⏱️  Step 2: Running timeout script (TimeOut.csv)...');
  try {
    await runInBackend('npm run timeout');
  } catch (err: any) {
    console.warn('⚠️  Timeout script failed (non-fatal):', err?.message || err);
  }

  // 3. Read data.json into memory, then delete it
  console.log('\n📖 Step 3: Loading raw data and removing data.json...');
  let rawData: DataJsonRecord[];
  try {
    const content = await fs.readFile(DATA_JSON_PATH, 'utf-8');
    rawData = JSON.parse(content) as DataJsonRecord[];
    await fs.unlink(DATA_JSON_PATH).catch(() => {});
    console.log(`   Loaded ${rawData.length} records; data.json removed.`);
  } catch (err: any) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      console.log('   data.json not present (e.g. no new data). Exiting pipeline.');
      process.exit(0);
    }
    console.error('❌ Failed to read data.json:', err?.message || err);
    process.exit(1);
  }

  if (rawData.length === 0) {
    console.log('   No records. Exiting pipeline.');
    process.exit(0);
  }

  // 4. Transform in memory (reads meta.csv + TimeOut.csv only)
  console.log('\n🔄 Step 4: Transforming in memory (meta.csv + TimeOut.csv)...');
  const rawExport: RawDataRecordExport[] = rawData.map((r) => ({
    EncounterDate: r.EncounterDate,
    InvoiceNo: r.InvoiceNo,
    LabNo: r.LabNo,
    Src: r.Src,
    TestName: r.TestName,
  }));
  const { patientsDataset, testsDataset } = transformInMemory(rawExport, { full: true });
  console.log(`   Patients: ${patientsDataset.length}, Tests: ${testsDataset.length}`);

  // 5. Ingest encounters from rawData
  console.log('\n📝 Step 5: Ingesting encounters...');
  await ingestEncountersFromRawData(rawData);

  // 6. Ingest patients from memory
  console.log('\n📝 Step 6: Ingesting patients...');
  await ingestPatientsFromMemory(patientsDataset as any);

  // 7. Sync encounters from patients (so encounter rows match patients)
  console.log('\n📝 Step 7: Syncing encounters from patients...');
  await syncEncounters();

  // 8. Ingest test records from memory (includes time_out from TimeOut.csv)
  console.log('\n📝 Step 8: Ingesting test records...');
  await ingestTestRecordsFromMemory(testsDataset);

  console.log('\n✅ In-memory pipeline completed. No data.json, patients_dataset.json, or tests_dataset.json left on disk.');
}

main().catch((err) => {
  console.error('❌ Pipeline failed:', err);
  process.exit(1);
});
