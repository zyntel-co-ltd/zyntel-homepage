import cron from 'node-cron';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { emitToAll } from '../config/socket';

const execAsync = promisify(exec);
const BACKEND_DIR = path.resolve(__dirname, '../..');

const runInBackend = (cmd: string) =>
  execAsync(cmd, { cwd: BACKEND_DIR, windowsHide: true });

export const initializeScheduler = () => {
  console.log('📅 Initializing task scheduler...');

  // Every 5 minutes: In-memory pipeline (no data.json / patients_dataset / tests_dataset left on disk)
  cron.schedule('*/5 * * * *', async () => {
    console.log('Running in-memory data pipeline (fetch → timeout → transform → ingest)...');
    try {
      await runInBackend('npm run pipeline');

      emitToAll('data-updated', { timestamp: new Date() });
      console.log('✅ In-memory pipeline completed');
    } catch (error) {
      console.error('❌ Data pipeline failed:', error);
    }
  });

  // meta.csv export: only on metadata changes (see MetadataController, adminService, ingest-test-records)

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