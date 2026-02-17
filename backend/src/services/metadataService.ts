import { query, transaction } from '../config/database';
import { TestMetadata } from '../types';
import fs from 'fs/promises';
import path from 'path';
import { createObjectCsvWriter } from 'csv-writer';

export const getAllMetadata = async (filters?: {
  labSection?: string;
  search?: string;
  page?: number | string;
  limit?: number | string;
}) => {
  let whereClause = '1=1';
  const params: any[] = [];
  let paramCount = 1;

  if (filters?.labSection && filters.labSection !== 'all') {
    whereClause += ` AND LOWER(current_lab_section) = LOWER($${paramCount++})`;
    params.push(filters.labSection);
  }

  if (filters?.search) {
    whereClause += ` AND LOWER(test_name) LIKE LOWER($${paramCount++})`;
    params.push(`%${filters.search}%`);
  }

  const hasPage = filters?.page != null && filters?.page !== '';
  const limitNum = Math.min(parseInt(String(filters?.limit), 10) || 50, 100);

  if (hasPage) {
    const page = Math.max(1, parseInt(String(filters?.page), 10) || 1);
    const offset = (page - 1) * limitNum;

    const countResult = await query(
      `SELECT COUNT(*) AS total FROM test_metadata WHERE ${whereClause}`,
      params
    );
    const totalRecords = parseInt(countResult.rows[0].total as string, 10);
    const totalPages = Math.max(1, Math.ceil(totalRecords / limitNum));

    params.push(limitNum, offset);
    const result = await query(
      `SELECT * FROM test_metadata WHERE ${whereClause} ORDER BY test_name ASC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    return { data: result.rows, totalRecords, totalPages };
  }

  const result = await query(
    `SELECT * FROM test_metadata WHERE ${whereClause} ORDER BY test_name ASC`,
    params
  );
  return result.rows;
};

export const createMetadata = async (
  testName: string,
  price: number,
  tat: number,
  labSection: string,
  createdBy: number
) => {
  return await transaction(async (client) => {
    const result = await client.query(
      `INSERT INTO test_metadata (test_name, current_price, current_tat, current_lab_section, is_default) 
       VALUES ($1, $2, $3, $4, false) 
       RETURNING *`,
      [testName, price, tat, labSection]
    );

    const metadata = result.rows[0];

    // Create initial history record
    await client.query(
      `INSERT INTO test_metadata_history 
       (test_metadata_id, price, tat, lab_section, effective_from, changed_by) 
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5)`,
      [metadata.id, price, tat, labSection, createdBy]
    );

    // Log audit
    await client.query(
      `INSERT INTO audit_log (user_id, action, table_name, record_id, new_values) 
       VALUES ($1, $2, $3, $4, $5)`,
      [createdBy, 'CREATE_METADATA', 'test_metadata', metadata.id, JSON.stringify(metadata)]
    );

    return metadata;
  });
};

export const updateMetadata = async (
  id: number,
  updates: {
    testName?: string;
    price?: number;
    tat?: number;
    labSection?: string;
  },
  updatedBy: number,
  reason?: string
) => {
  return await transaction(async (client) => {
    // Get current metadata
    const currentResult = await client.query(
      'SELECT * FROM test_metadata WHERE id = $1',
      [id]
    );
    const current = currentResult.rows[0];

    // Handle test name change
    if (updates.testName && updates.testName !== current.test_name) {
      await client.query(
        `INSERT INTO test_name_changes (old_name, new_name, test_metadata_id, changed_by) 
         VALUES ($1, $2, $3, $4)`,
        [current.test_name, updates.testName, id, updatedBy]
      );
    }

    // Check if price, TAT, or lab section changed
    const priceChanged = updates.price !== undefined && updates.price !== current.current_price;
    const tatChanged = updates.tat !== undefined && updates.tat !== current.current_tat;
    const sectionChanged = updates.labSection !== undefined && updates.labSection !== current.current_lab_section;

    if (priceChanged || tatChanged || sectionChanged) {
      // Close current history record
      await client.query(
        `UPDATE test_metadata_history 
         SET effective_to = CURRENT_TIMESTAMP 
         WHERE test_metadata_id = $1 AND effective_to IS NULL`,
        [id]
      );

      // Create new history record
      await client.query(
        `INSERT INTO test_metadata_history 
         (test_metadata_id, price, tat, lab_section, effective_from, changed_by, change_reason) 
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5, $6)`,
        [
          id,
          updates.price ?? current.current_price,
          updates.tat ?? current.current_tat,
          updates.labSection ?? current.current_lab_section,
          updatedBy,
          reason,
        ]
      );
    }

    // Update metadata
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (updates.testName !== undefined) {
      fields.push(`test_name = $${paramCount++}`);
      values.push(updates.testName);
    }
    if (updates.price !== undefined) {
      fields.push(`current_price = $${paramCount++}`);
      values.push(updates.price);
    }
    if (updates.tat !== undefined) {
      fields.push(`current_tat = $${paramCount++}`);
      values.push(updates.tat);
    }
    if (updates.labSection !== undefined) {
      fields.push(`current_lab_section = $${paramCount++}`);
      values.push(updates.labSection);
    }

    fields.push(`is_default = false`);
    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await client.query(
      `UPDATE test_metadata SET ${fields.join(', ')} 
       WHERE id = $${paramCount} 
       RETURNING *`,
      values
    );

    // Log audit
    await client.query(
      `INSERT INTO audit_log (user_id, action, table_name, record_id, old_values, new_values) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [updatedBy, 'UPDATE_METADATA', 'test_metadata', id, JSON.stringify(current), JSON.stringify(updates)]
    );

    return result.rows[0];
  });
};

export const deleteMetadata = async (id: number, deletedBy: number) => {
  await transaction(async (client) => {
    await client.query(
      `INSERT INTO audit_log (user_id, action, table_name, record_id) 
       VALUES ($1, $2, $3, $4)`,
      [deletedBy, 'DELETE_METADATA', 'test_metadata', id]
    );

    await client.query('DELETE FROM test_metadata WHERE id = $1', [id]);
  });
};

export const exportMetadataToCSV = async () => {
  const result = await query(
    'SELECT test_name, current_tat, current_lab_section, current_price FROM test_metadata WHERE is_default = false ORDER BY test_name'
  );

  const csvPath = path.join(process.env.PUBLIC_DIR || '../frontend/public', 'meta.csv');

  const csvWriter = createObjectCsvWriter({
    path: csvPath,
    header: [
      { id: 'test_name', title: 'TestName' },
      { id: 'current_tat', title: 'TAT' },
      { id: 'current_lab_section', title: 'LabSection' },
      { id: 'current_price', title: 'Price' },
    ],
  });

  await csvWriter.writeRecords(result.rows);
  console.log('Meta.csv exported successfully');
};

export const cleanDefaultMetadata = async () => {
  // Only delete is_default=true tests that:
  // 1. Have NO test_records (never been used)
  // 2. This preserves tests from data.json so users can update them via UI

  const result = await query(
    `DELETE FROM test_metadata
     WHERE is_default = true
     AND id NOT IN (
       SELECT DISTINCT test_metadata_id
       FROM test_records
       WHERE test_metadata_id IS NOT NULL
     )
     RETURNING test_name`
  );

  console.log(`🧹 Cleaned ${result.rows.length} unused default metadata entries`);
  return result.rows;
};