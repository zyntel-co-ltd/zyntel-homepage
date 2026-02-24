import cron from 'node-cron';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { emitToAll } from '../config/socket';
import { exportMetadataToCSV } from './metadataService';

const execAsync = promisify(exec);
const BACKEND_DIR = path.resolve(__dirname, '../..');

const runInBackend = (cmd: string) =>
  execAsync(cmd, { cwd: BACKEND_DIR });

export const initializeScheduler = () => {
  console.log('📅 Initializing task scheduler...');

  // Every 2 minutes: Full pipeline from fetch (LIMS) to database
  cron.schedule('*/2 * * * *', async () => {
    console.log('Running full data pipeline (fetch → timeout → transform → ingest)...');
    try {
      // 1. Fetch from LIMS (data.json)
      await runInBackend('npm run fetch-data');
      // 2. Timeout (Z: drive / TimeOut.csv)
      await runInBackend('npm run timeout');
      // 3. Transform (patients_dataset.json) - must run before ingest-patients
      await runInBackend('npm run transform:full');
      // 4. Ingest encounters + test_records (Tests, Revenue, Tracker)
      await runInBackend('npm run ingest-old');
      // 5. Ingest patients (Numbers, TAT, Performance, Progress)
      await runInBackend('npm run ingest');

      emitToAll('data-updated', { timestamp: new Date() });
      console.log('✅ Full data pipeline completed');
    } catch (error) {
      console.error('❌ Data pipeline failed:', error);
    }
  });

  // Every hour: Export meta.csv backup
  cron.schedule('0 * * * *', async () => {
    console.log('Exporting meta.csv backup...');
    try {
      await exportMetadataToCSV();
      console.log('✅ Meta.csv exported');
    } catch (error) {
      console.error('❌ Meta.csv export failed:', error);
    }
  });

  // Every day at midnight: Cleanup old audit logs (keep last 90 days)
  cron.schedule('0 0 * * *', async () => {
    console.log('Cleaning up old audit logs...');
    try {
      const { query } = await import('../config/database');
      await query(
        `DELETE FROM audit_log 
         WHERE created_at < NOW() - INTERVAL '90 days'`
      );
      console.log('✅ Audit logs cleaned');
    } catch (error) {
      console.error('❌ Audit cleanup failed:', error);
    }
  });

  console.log('✅ Scheduler initialized');
};