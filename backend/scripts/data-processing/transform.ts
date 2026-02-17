/**
 * transform.ts - TypeScript port of Flask's transform.py
 * 
 * Transforms raw data.json (from LIMS) into structured datasets:
 * - tests_dataset.json: Individual test records with all metadata
 * - patients_dataset.json: Aggregated patient/encounter records with calculated fields
 * 
 * Key transformations:
 * 1. Parse lab numbers to extract Time_In and calculate Shift
 * 2. Calculate Daily_TAT from test TATs
 * 3. Match timeout.csv data for Request_Time_Out
 * 4. Calculate delay status and time ranges
 */

import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'csv-parse/sync';

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const DEFAULT_DATE_STR = '1970-01-01';
const DEFAULT_DATETIME = new Date('1970-01-01T00:00:00');
const DEFAULT_DATETIME_STR = '1970-01-01 00:00:00';
const DEFAULT_STRING = 'N/A';
const DEFAULT_NUMERIC = 0.0;
const DEFAULT_DELAY_STATUS = 'Not Uploaded';
const DEFAULT_TIME_RANGE = 'Not Uploaded';
const DEFAULT_URGENCY = 'Not Urgent';

const CLIENT_IDENTIFIER = process.env.CLIENT_IDENTIFIER || 'NHL_Lab';

// File paths
const PUBLIC_DIR = path.join(__dirname, '../../../frontend/public');
const LOGS_DIR = path.join(__dirname, '../../logs');
const DATA_JSON_PATH = path.join(PUBLIC_DIR, 'data.json');
const META_CSV_PATH = path.join(PUBLIC_DIR, 'meta.csv');
const TIMEOUT_CSV_PATH = path.join(PUBLIC_DIR, 'TimeOut.csv');
const TESTS_DATASET_JSON_PATH = path.join(PUBLIC_DIR, 'tests_dataset.json');
const PATIENTS_DATASET_JSON_PATH = path.join(PUBLIC_DIR, 'patients_dataset.json');
const PROCESSED_INVOICES_FILE = path.join(PUBLIC_DIR, 'processed_invoice_numbers.json');
const INVALID_LABNOS_OUTPUT_PATH = path.join(LOGS_DIR, 'data_json_invalid_labnos.txt');
const UNMATCHED_TEST_NAMES_OUTPUT_PATH = path.join(LOGS_DIR, 'data_json_unmatched_test_names.txt');

// Ensure directories exist
if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });
if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });

// ============================================================================
// INTERFACES
// ============================================================================

interface RawDataRecord {
  EncounterDate: string;
  InvoiceNo: string;
  LabNo: string;
  Src: string;
  TestName: string;
}

interface MetaInfo {
  TestName: string;
  TAT: number;
  LabSection: string;
  Price: number;
}

interface TimeoutRecord {
  FileName: string;
  CreationTime: Date;
}

interface TestRecord {
  ID: string;
  Lab_Number: string;
  Test_Name: string;
  Lab_Section: string;
  TAT: number;
  Price: number;
  Time_Received: string;
  Test_Time_Expected: string;
  Urgency: string;
  Test_Time_Out: string;
}

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
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parses DDMMYYHHMM timestamp from a lab number
 * Returns a Date object or DEFAULT_DATETIME on failure
 */
function parseLabNoTimestamp(labNo: string): Date {
  if (!labNo || typeof labNo !== 'string' || labNo.length < 10) {
    return DEFAULT_DATETIME;
  }

  const timestampStr = labNo.substring(0, 10);

  if (!/^\d{10}$/.test(timestampStr)) {
    return DEFAULT_DATETIME;
  }

  try {
    const dd = timestampStr.substring(0, 2);
    const mm = timestampStr.substring(2, 4);
    const yy = timestampStr.substring(4, 6);
    const hh = timestampStr.substring(6, 8);
    const min = timestampStr.substring(8, 10);

    // Create date string in format: 20YY-MM-DD HH:MM
    const dateStr = `20${yy}-${mm}-${dd} ${hh}:${min}:00`;
    const dt = new Date(dateStr);

    // Validate the date is valid
    if (isNaN(dt.getTime())) {
      return DEFAULT_DATETIME;
    }

    return dt;
  } catch (error) {
    return DEFAULT_DATETIME;
  }
}

/**
 * Determines shift based on Time_In datetime
 */
function getShift(timeInDt: Date): string {
  if (!timeInDt || timeInDt.getTime() === DEFAULT_DATETIME.getTime()) {
    return DEFAULT_STRING;
  }

  const hour = timeInDt.getHours();
  if (hour >= 8 && hour <= 19) {
    return 'Day Shift';
  } else {
    return 'Night Shift';
  }
}

/**
 * Calculates daily TAT from a list of TATs (returns max or 0)
 */
function calculateDailyTAT(tatsList: number[]): number {
  if (!tatsList || tatsList.length === 0) {
    return DEFAULT_NUMERIC;
  }

  const validTats = tatsList.filter(tat => tat > 0);
  if (validTats.length === 0) {
    return DEFAULT_NUMERIC;
  }

  return Math.max(...validTats);
}

/**
 * Calculates delay status and time range based on times
 */
function calculateDelayStatusAndRange(
  timeIn: Date,
  timeOut: Date,
  timeExpected: Date
): { delayStatus: string; timeRange: string } {
  // Not uploaded
  if (timeOut.getTime() === DEFAULT_DATETIME.getTime()) {
    return {
      delayStatus: DEFAULT_DELAY_STATUS,
      timeRange: DEFAULT_TIME_RANGE
    };
  }

  const actualTatMinutes = (timeOut.getTime() - timeIn.getTime()) / (1000 * 60);
  const expectedTatMinutes = (timeExpected.getTime() - timeIn.getTime()) / (1000 * 60);

  // Calculate delay
  const delay = actualTatMinutes - expectedTatMinutes;

  // Determine delay status
  let delayStatus: string;
  if (delay <= 0) {
    delayStatus = 'On-Time';
  } else if (delay < 15) {
    delayStatus = 'Delayed';
  } else {
    delayStatus = 'Over-Delayed';
  }

  // Determine time range
  let timeRange: string;
  if (delay <= 0) {
    timeRange = 'Swift';
  } else if (delay < 15) {
    timeRange = '<15min';
  } else if (delay >= 15 && delay < 60) {
    timeRange = '15-60min';
  } else if (delay >= 60 && delay < 180) {
    timeRange = '1-3hrs';
  } else if (delay >= 180 && delay < 1440) {
    timeRange = '3-24hrs';
  } else {
    timeRange = '>24hrs';
  }

  return { delayStatus, timeRange };
}

/**
 * Formats a Date to 'YYYY-MM-DD HH:MM:SS' string
 */
function formatDateTime(dt: Date): string {
  if (!dt || dt.getTime() === DEFAULT_DATETIME.getTime()) {
    return DEFAULT_DATETIME_STR;
  }

  const year = dt.getFullYear();
  const month = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  const hours = String(dt.getHours()).padStart(2, '0');
  const minutes = String(dt.getMinutes()).padStart(2, '0');
  const seconds = String(dt.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// ============================================================================
// DATA LOADING FUNCTIONS
// ============================================================================

/**
 * Loads meta.csv and creates a lookup map
 */
function loadMetaData(): Map<string, MetaInfo> {
  console.log('📖 Loading meta.csv...');
  
  if (!fs.existsSync(META_CSV_PATH)) {
    console.warn('⚠️  meta.csv not found, using default values');
    return new Map();
  }

  const metaMap = new Map<string, MetaInfo>();
  
  try {
    const fileContent = fs.readFileSync(META_CSV_PATH, 'utf-8');
    const records = csv.parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,  /* Skip malformed lines (e.g. commas in TestName) */
      relax_quotes: true
    });

    let skipped = 0;
    for (const row of records) {
      const testName = row?.TestName?.trim();
      if (!testName) {
        skipped++;
        continue;
      }
      /* Need at least TAT or LabSection; skip rows that look broken */
      const tat = row?.TAT != null ? parseFloat(String(row.TAT)) : NaN;
      const labSection = (row?.LabSection && String(row.LabSection).trim()) || DEFAULT_STRING;
      const price = row?.Price != null ? parseFloat(String(row.Price)) : DEFAULT_NUMERIC;
      if (isNaN(tat) && labSection === DEFAULT_STRING) {
        skipped++;
        continue;
      }

      metaMap.set(testName, {
        TestName: testName,
        TAT: isNaN(tat) ? DEFAULT_NUMERIC : tat,
        LabSection: labSection,
        Price: isNaN(price) ? DEFAULT_NUMERIC : price
      });
    }
    if (skipped > 0) {
      console.log(`⚠️  Skipped ${skipped} meta rows (missing or invalid)`);
    }
    console.log(`✅ Loaded ${metaMap.size} test metadata entries`);
  } catch (error) {
    console.error('❌ Error loading meta.csv:', error);
  }

  return metaMap;
}

/**
 * Loads TimeOut.csv and creates a lookup map by invoice number
 */
function loadTimeoutData(): Map<string, TimeoutRecord> {
  console.log('📖 Loading TimeOut.csv...');
  
  if (!fs.existsSync(TIMEOUT_CSV_PATH)) {
    console.warn('⚠️  TimeOut.csv not found');
    return new Map();
  }

  const timeoutMap = new Map<string, TimeoutRecord>();
  
  try {
    const fileContent = fs.readFileSync(TIMEOUT_CSV_PATH, 'utf-8');
    const records = csv.parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    const dateFormats = [
      /(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})\s+(AM|PM)/i,
    ];

    for (const row of records) {
      const fileName = row.FileName?.trim();
      const creationTimeStr = row.CreationTime?.trim();
      
      if (!fileName || !creationTimeStr) continue;

      let creationTime: Date | null = null;

      // Try to parse the date
      for (const format of dateFormats) {
        const match = creationTimeStr.match(format);
        if (match) {
          let [, month, day, year, hours, minutes, ampm] = match;
          let hour = parseInt(hours);
          
          if (ampm.toUpperCase() === 'PM' && hour !== 12) hour += 12;
          if (ampm.toUpperCase() === 'AM' && hour === 12) hour = 0;

          creationTime = new Date(
            parseInt(year),
            parseInt(month) - 1,
            parseInt(day),
            hour,
            parseInt(minutes)
          );
          break;
        }
      }

      if (creationTime && !isNaN(creationTime.getTime())) {
        // Keep the latest timeout for each invoice
        const existing = timeoutMap.get(fileName);
        if (!existing || creationTime > existing.CreationTime) {
          timeoutMap.set(fileName, {
            FileName: fileName,
            CreationTime: creationTime
          });
        }
      }
    }

    console.log(`✅ Loaded ${timeoutMap.size} timeout records`);
  } catch (error) {
    console.error('❌ Error loading TimeOut.csv:', error);
  }

  return timeoutMap;
}

/**
 * Loads processed invoice numbers
 */
function loadProcessedInvoices(): Set<string> {
  if (!fs.existsSync(PROCESSED_INVOICES_FILE)) {
    return new Set();
  }

  try {
    const data = fs.readFileSync(PROCESSED_INVOICES_FILE, 'utf-8');
    const invoices = JSON.parse(data);
    return new Set(invoices);
  } catch (error) {
    console.warn('⚠️  Could not load processed invoices, starting fresh');
    return new Set();
  }
}

/**
 * Saves processed invoice numbers
 */
function saveProcessedInvoices(invoices: Set<string>) {
  try {
    const data = JSON.stringify(Array.from(invoices), null, 2);
    fs.writeFileSync(PROCESSED_INVOICES_FILE, data, 'utf-8');
  } catch (error) {
    console.error('❌ Error saving processed invoices:', error);
  }
}

// ============================================================================
// MAIN TRANSFORMATION LOGIC
// ============================================================================

async function runDataTransformation() {
  const isFullRun = process.argv.includes('--full');
  if (isFullRun) {
    console.log('🔄 Full run: processing ALL records from data.json (ignoring processed_invoice_numbers)...');
  }
  console.log('🔄 Starting data transformation...');
  console.log(`📂 Reading data from: ${DATA_JSON_PATH}`);

  // Load reference data
  const metaMap = loadMetaData();
  const timeoutMap = loadTimeoutData();
  /* After a DB reset, use --full to reprocess everything; otherwise incremental */
  const processedInvoices = isFullRun ? new Set<string>() : loadProcessedInvoices();
  if (!isFullRun && processedInvoices.size > 0) {
    console.log(`ℹ️  Incremental run: ${processedInvoices.size} invoices already processed (use --full to reprocess all)`);
  }
  const newlyProcessedInvoices = new Set<string>();

  // Load raw data
  if (!fs.existsSync(DATA_JSON_PATH)) {
    console.error('❌ data.json not found!');
    process.exit(1);
  }

  const rawData: RawDataRecord[] = JSON.parse(
    fs.readFileSync(DATA_JSON_PATH, 'utf-8')
  );

  console.log(`📊 Processing ${rawData.length} records from data.json...`);

  // Data structures for aggregation
  const testsDataset: TestRecord[] = [];
  const patientsDataMap = new Map<string, {
    Tats: number[];
    InvoiceNos: Set<string>;
    Details: {
      LabNo: string;
      Client: string;
      Date: string;
      Time_In: string;
      Unit: string;
    };
  }>();

  const invalidLabNos = new Map<string, number>();
  const unmatchedTestNames = new Set<string>();
  const invalidLabNosLog = fs.createWriteStream(INVALID_LABNOS_OUTPUT_PATH, { flags: 'w' });

  // Process each record
  for (const record of rawData) {
    const labNo = record.LabNo;
    const invoiceNo = record.InvoiceNo;
    const testName = record.TestName;

    // Skip if already processed
    if (processedInvoices.has(invoiceNo)) {
      continue;
    }

    // Validate lab number format
    if (!labNo || labNo.length < 10 || !/^\d{10}/.test(labNo)) {
      invalidLabNos.set(labNo, (invalidLabNos.get(labNo) || 0) + 1);
      continue;
    }

    // Get metadata for this test
    const metaInfo = metaMap.get(testName);
    if (!metaInfo) {
      unmatchedTestNames.add(testName);
      // Use defaults
    }

    const tat = metaInfo?.TAT || DEFAULT_NUMERIC;
    const labSection = metaInfo?.LabSection || DEFAULT_STRING;
    const price = metaInfo?.Price || DEFAULT_NUMERIC;

    // Parse lab number timestamp
    const timeInDt = parseLabNoTimestamp(labNo);
    
    // Calculate test time expected
    const testTimeExpectedDt = new Date(timeInDt.getTime() + tat * 60 * 1000);

    // Get timeout for this invoice
    const timeoutInfo = timeoutMap.get(invoiceNo);
    const testTimeOutDt = timeoutInfo?.CreationTime || DEFAULT_DATETIME;

    // Generate unique ID for test
    const testId = `${labNo}_${testName}_${invoiceNo}`;

    // Create test record
    const testRecord: TestRecord = {
      ID: testId,
      Lab_Number: labNo,
      Test_Name: testName,
      Lab_Section: labSection,
      TAT: tat,
      Price: price,
      Time_Received: formatDateTime(timeInDt),
      Test_Time_Expected: formatDateTime(testTimeExpectedDt),
      Urgency: DEFAULT_URGENCY,
      Test_Time_Out: formatDateTime(testTimeOutDt)
    };

    testsDataset.push(testRecord);

    // Aggregate patient-level data
    if (!patientsDataMap.has(labNo)) {
      patientsDataMap.set(labNo, {
        Tats: [],
        InvoiceNos: new Set(),
        Details: {
          LabNo: labNo,
          Client: CLIENT_IDENTIFIER,
          Date: record.EncounterDate || DEFAULT_DATE_STR,
          Time_In: formatDateTime(timeInDt),
          Unit: record.Src || DEFAULT_STRING
        }
      });
    }

    const patientData = patientsDataMap.get(labNo)!;
    patientData.Tats.push(tat);
    patientData.InvoiceNos.add(invoiceNo);

    newlyProcessedInvoices.add(invoiceNo);
  }

  // Log invalid lab numbers
  for (const [labNo, count] of invalidLabNos.entries()) {
    invalidLabNosLog.write(`LabNo: ${labNo}, Occurrences: ${count}\n`);
  }
  invalidLabNosLog.end();
  console.log(`📝 Logged ${invalidLabNos.size} invalid lab numbers`);

  // Finalize patient-level data
  console.log('📊 Finalizing patient records...');
  const patientsDataset: PatientRecord[] = [];

  for (const [labNo, data] of patientsDataMap.entries()) {
    const timeInDt = parseLabNoTimestamp(labNo);
    const dailyTat = calculateDailyTAT(data.Tats);

    // Find latest timeout across all invoices
    let latestTimeout = DEFAULT_DATETIME;
    for (const invoiceNo of data.InvoiceNos) {
      const timeoutInfo = timeoutMap.get(invoiceNo);
      if (timeoutInfo && timeoutInfo.CreationTime > latestTimeout) {
        latestTimeout = timeoutInfo.CreationTime;
      }
    }

    const requestTimeOutDt = latestTimeout;
    const requestTimeExpectedDt = new Date(timeInDt.getTime() + dailyTat * 60 * 1000);

    // Calculate delay status and range
    const { delayStatus, timeRange } = calculateDelayStatusAndRange(
      timeInDt,
      requestTimeOutDt,
      requestTimeExpectedDt
    );

    const patientRecord: PatientRecord = {
      Lab_Number: labNo,
      Client: CLIENT_IDENTIFIER,
      Date: data.Details.Date,
      Shift: getShift(timeInDt),
      Unit: data.Details.Unit,
      Time_In: formatDateTime(timeInDt),
      Daily_TAT: dailyTat,
      Request_Time_Expected: formatDateTime(requestTimeExpectedDt),
      Request_Time_Out: formatDateTime(requestTimeOutDt),
      Request_Delay_Status: delayStatus,
      Request_Time_Range: timeRange
    };

    patientsDataset.push(patientRecord);
  }

  // Save outputs
  console.log('💾 Saving transformed datasets...');

  fs.writeFileSync(
    TESTS_DATASET_JSON_PATH,
    JSON.stringify(testsDataset, null, 2),
    'utf-8'
  );
  console.log(`✅ Saved ${testsDataset.length} test records to tests_dataset.json`);

  fs.writeFileSync(
    PATIENTS_DATASET_JSON_PATH,
    JSON.stringify(patientsDataset, null, 2),
    'utf-8'
  );
  console.log(`✅ Saved ${patientsDataset.length} patient records to patients_dataset.json`);

  // Save unmatched test names
  fs.writeFileSync(
    UNMATCHED_TEST_NAMES_OUTPUT_PATH,
    Array.from(unmatchedTestNames).join('\n'),
    'utf-8'
  );
  console.log(`📝 Logged ${unmatchedTestNames.size} unmatched test names`);

  // Update processed invoices
  for (const invoice of newlyProcessedInvoices) {
    processedInvoices.add(invoice);
  }
  saveProcessedInvoices(processedInvoices);

  console.log('\n✅ Data transformation completed successfully!');
  console.log(`📊 Summary:`);
  console.log(`   - Tests: ${testsDataset.length}`);
  console.log(`   - Patients: ${patientsDataset.length}`);
  console.log(`   - Invalid lab numbers: ${invalidLabNos.size}`);
  console.log(`   - Unmatched test names: ${unmatchedTestNames.size}`);
  console.log(`   - Newly processed invoices: ${newlyProcessedInvoices.size}`);
}

// ============================================================================
// ENTRY POINT
// ============================================================================

if (require.main === module) {
  runDataTransformation()
    .then(() => {
      console.log('✅ Transform script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Transform script failed:', error);
      process.exit(1);
    });
}

export { runDataTransformation };
