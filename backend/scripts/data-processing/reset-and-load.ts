/**
 * Reset Meta and reload: truncate test_metadata, load meta.csv, run ingest from data.json
 * Use this to get a clean slate and see unmatched tests.
 *
 * Order:
 * 1. Truncate test_records (has FK to test_metadata)
 * 2. Truncate test_metadata
 * 3. Truncate unmatched_tests
 * 4. Import meta.csv
 * 5. Run ingest (data.json) - unmatched tests logged to unmatched_tests
 */
import { query } from '../../src/config/database';
import importMetaCSV from './import-meta';
import ingestData from './ingest';

async function resetAndLoad() {
  console.log('🔄 Reset and reload pipeline...\n');

  try {
    console.log('📝 Step 1: Truncating test_records...');
    await query('TRUNCATE TABLE test_records CASCADE');
    console.log('   Done.\n');

    console.log('📝 Step 2: Truncating test_metadata...');
    await query('TRUNCATE TABLE test_metadata CASCADE');
    console.log('   Done.\n');

    console.log('📝 Step 3: Truncating unmatched_tests...');
    await query('TRUNCATE TABLE unmatched_tests');
    console.log('   Done.\n');

    console.log('📝 Step 4: Importing meta.csv...');
    await importMetaCSV();
    console.log('   Done.\n');

    console.log('📝 Step 5: Ingesting data.json...');
    await ingestData();
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
