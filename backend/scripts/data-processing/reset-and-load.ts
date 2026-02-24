/**
 * Reset Meta and reload: fetch data, truncate, load meta.csv, run full ingest pipeline.
 * Updates both test_records/encounters AND patients table (Numbers, TAT pages).
 *
 * Order:
 * 1. Fetch data (updates data.json from LIMS)
 * 2. Truncate test_records, test_metadata, unmatched_tests
 * 3. Import meta.csv
 * 4. Ingest encounters + test_records (ingest.ts)
 * 5. Transform full (patients_dataset.json from data.json)
 * 6. Ingest patients (ingest-patients.ts)
 */
import { execSync } from 'child_process';
import path from 'path';
import { query } from '../../src/config/database';
import importMetaCSV from './import-meta';
import ingestData from './ingest';

const BACKEND_DIR = path.resolve(__dirname, '../..');

function run(cmd: string, optional = false) {
  try {
    execSync(cmd, { cwd: BACKEND_DIR, stdio: 'inherit' });
  } catch (e) {
    if (optional) {
      console.warn(`⚠️  Optional step failed (continuing): ${cmd}`);
    } else {
      throw e;
    }
  }
}

async function resetAndLoad() {
  console.log('🔄 Reset and reload pipeline...\n');

  try {
    console.log('📥 Step 1: Fetching data (data.json)...');
    run('npm run fetch-data', true);
    console.log('   Done.\n');

    console.log('📝 Step 2: Truncating test_records...');
    await query('TRUNCATE TABLE test_records CASCADE');
    console.log('   Done.\n');

    console.log('📝 Step 3: Truncating test_metadata...');
    await query('TRUNCATE TABLE test_metadata CASCADE');
    console.log('   Done.\n');

    console.log('📝 Step 4: Truncating unmatched_tests...');
    await query('TRUNCATE TABLE unmatched_tests');
    console.log('   Done.\n');

    console.log('📝 Step 5: Importing meta.csv...');
    await importMetaCSV();
    console.log('   Done.\n');

    console.log('📝 Step 6: Ingesting encounters + test_records (data.json)...');
    await ingestData();
    console.log('   Done.\n');

    console.log('📝 Step 7: Transform full (patients_dataset.json)...');
    run('npm run transform:full');
    console.log('   Done.\n');

    console.log('📝 Step 8: Ingesting patients table (Numbers, TAT)...');
    run('npm run ingest');
    console.log('   Done.\n');

    console.log('✅ Reset and reload complete. Check Admin > Unmatched Tests for any unmatched test names.');
  } catch (error: any) {
    console.error('❌ Reset failed:', error?.message ?? error);
    process.exit(1);
  }
}

if (require.main === module) {
  resetAndLoad()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default resetAndLoad;
