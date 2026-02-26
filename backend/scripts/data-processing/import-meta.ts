import fs from 'fs/promises';
import path from 'path';
import { query } from '../../src/config/database';
import { exportMetadataToCSV } from '../../src/services/metadataService';
import csv from 'csv-parse/sync';

const PUBLIC_DIR = path.join(__dirname, '../../../frontend/public');

async function importMetaCSV() {
  console.log('📥 Importing meta.csv - Updating ALL tests...');

  try {
    // Read meta.csv from frontend/public
    const metaCsvPath = path.join(PUBLIC_DIR, 'meta.csv');
    console.log(`📂 Reading meta.csv from: ${metaCsvPath}`);
    
    const metaCsvContent = await fs.readFile(metaCsvPath, 'utf-8');
    
    const metaRecords = csv.parse(metaCsvContent, {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
      relax_quotes: true,
      trim: true,
      on_record: (record) => {
        if (!record.TestName || !record.Price || !record.TAT || !record.LabSection) {
          console.warn(`⚠️  Skipping malformed record: ${JSON.stringify(record)}`);
          return null;
        }
        return record;
      }
    }).filter(Boolean);

    console.log(`📊 Found ${metaRecords.length} tests in meta.csv`);

    let updatedCount = 0;
    let createdCount = 0;
    let errorCount = 0;

    // Process each test from meta.csv
    for (const record of metaRecords) {
      try {
        const testName = record.TestName?.trim();
        const tat = parseInt(record.TAT) || 1440;
        const labSection = record.LabSection?.trim() || 'PENDING';
        const price = parseFloat(record.Price) || 0;

        if (!testName) {
          console.warn('⚠️  Skipping record with empty TestName');
          errorCount++;
          continue;
        }

        // CRITICAL FIX: Update OR insert ALL tests, regardless of is_default flag
        const result = await query(
          `INSERT INTO test_metadata (test_name, current_price, current_tat, current_lab_section, is_default)
           VALUES ($1, $2, $3, $4, false)
           ON CONFLICT (test_name) 
           DO UPDATE SET 
             current_price = EXCLUDED.current_price,
             current_tat = EXCLUDED.current_tat,
             current_lab_section = EXCLUDED.current_lab_section,
             is_default = false,
             updated_at = CURRENT_TIMESTAMP
           RETURNING (xmax = 0) AS inserted`,
          [testName, price, tat, labSection]
        );

        if (result.rows[0].inserted) {
          createdCount++;
        } else {
          updatedCount++;
        }
        
        if ((updatedCount + createdCount) % 50 === 0) {
          console.log(`⏳ Processed ${updatedCount + createdCount} tests...`);
        }

      } catch (error) {
        console.error(`❌ Error processing test: ${record.TestName}`, error);
        errorCount++;
      }
    }

    console.log(`\n✅ Meta.csv import completed:`);
    console.log(`   - ✅ Created: ${createdCount} new tests`);
    console.log(`   - ✅ Updated: ${updatedCount} existing tests`);
    console.log(`   - ❌ Errors: ${errorCount}`);

    // Now update test_records with the new metadata
    console.log(`\n🔄 Updating test_records with new metadata...`);
    
    const updateResult = await query(`
      UPDATE test_records tr
      SET 
        price_at_test = tm.current_price,
        tat_at_test = tm.current_tat,
        lab_section_at_test = tm.current_lab_section,
        updated_at = CURRENT_TIMESTAMP
      FROM test_metadata tm
      WHERE tr.test_metadata_id = tm.id
        AND (
          tr.price_at_test = 0 
          OR tr.tat_at_test = 1440 
          OR tr.lab_section_at_test = 'PENDING'
        )
    `);

    console.log(`✅ Updated ${updateResult.rowCount} test records with proper metadata`);

    if (createdCount > 0 || updatedCount > 0) {
      await exportMetadataToCSV();
      console.log('   meta.csv exported (metadata changed)');
    }

  } catch (error: any) {
    console.error('❌ Meta.csv import failed:', error.message);
    
    if (error.code === 'ENOENT') {
      console.error(`\n📁 File not found: meta.csv`);
      console.error(`   Expected location: ${PUBLIC_DIR}/meta.csv`);
      console.error(`   Please ensure the file exists before running this script.`);
    }
    
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  importMetaCSV()
    .then(() => {
      console.log('\n✅ Import complete');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Import failed:', error);
      process.exit(1);
    });
}

export default importMetaCSV;