import { query } from '../../src/config/database';
import * as fs from 'fs';
import * as path from 'path';

interface DataRecord {
  LabNo: string;
  Client: string;
  Date: string;
  Shift: string;
  Unit: string;
  TimeIn: string;
  DailyTAT: number;
  RequestTimeExpected: string;
  RequestTimeOut: string;
  RequestDelayStatus: string;
  RequestTimeRange: string;
}

async function populatePatientsTable() {
  console.log('🔄 Populating patients table from data.json...');

  try {
    // Load data.json
    const dataPath = path.join(__dirname, '../../../frontend/public/data.json');
    if (!fs.existsSync(dataPath)) {
      throw new Error(`data.json not found at ${dataPath}`);
    }

    const rawData = fs.readFileSync(dataPath, 'utf-8');
    const data: DataRecord[] = JSON.parse(rawData);
    
    console.log(`📊 Found ${data.length} records in data.json`);

    // No clients table in React app, skip client_id

    // Group by lab_number and get the most complete record for each
    const labNumberMap = new Map<string, DataRecord>();
    
    for (const record of data) {
      const labNo = record.LabNo;
      if (!labNo || labNo === 'N/A') continue;
      
      // Keep the record with the most complete data
      const existing = labNumberMap.get(labNo);
      if (!existing || (record.RequestTimeOut && record.RequestTimeOut !== 'N/A')) {
        labNumberMap.set(labNo, record);
      }
    }

    console.log(`📝 Processing ${labNumberMap.size} unique lab numbers...`);

    // Helper function to parse dates
    const parseDate = (dateStr: string): Date | null => {
      if (!dateStr || dateStr === 'N/A') return null;
      try {
        return new Date(dateStr);
      } catch {
        return null;
      }
    };

    // Insert/update patients table
    let inserted = 0;
    let updated = 0;
    let errors = 0;

    for (const [labNo, record] of labNumberMap.entries()) {
      try {
        const date = parseDate(record.Date);
        const timeIn = parseDate(record.TimeIn);
        const requestTimeExpected = parseDate(record.RequestTimeExpected);
        const requestTimeOut = parseDate(record.RequestTimeOut);

        if (!date) {
          console.warn(`⚠️  Skipping ${labNo}: invalid date`);
          errors++;
          continue;
        }

        const result = await query(
          `INSERT INTO patients (
            lab_number, client, date, shift, unit,
            time_in, daily_tat, request_time_expected, request_time_out,
            request_delay_status, request_time_range
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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
          RETURNING (xmax = 0) AS inserted`,
          [
            labNo,
            record.Client || null,
            date,
            record.Shift || null,
            record.Unit || null,
            timeIn,
            record.DailyTAT || null,
            requestTimeExpected,
            requestTimeOut,
            record.RequestDelayStatus || null,
            record.RequestTimeRange || null
          ]
        );

        if (result.rows[0].inserted) {
          inserted++;
        } else {
          updated++;
        }

        if ((inserted + updated) % 1000 === 0) {
          console.log(`⏳ Processed ${inserted + updated} records...`);
        }
      } catch (error) {
        console.error(`❌ Error processing ${labNo}:`, error);
        errors++;
      }
    }

    console.log('\n✅ Population complete:');
    console.log(`   - Inserted: ${inserted}`);
    console.log(`   - Updated: ${updated}`);
    console.log(`   - Errors: ${errors}`);

    // Verification
    const countResult = await query('SELECT COUNT(*) FROM patients');
    console.log(`\n📊 Total patients in table: ${countResult.rows[0].count}`);

  } catch (error) {
    console.error('❌ Population failed:', error);
    throw error;
  }
}

populatePatientsTable()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
