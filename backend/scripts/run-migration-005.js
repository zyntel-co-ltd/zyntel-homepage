require('dotenv').config();
const { Client } = require('pg');

const client = new Client({ connectionString: process.env.DATABASE_URL });

client.connect()
  .then(() => client.query('ALTER TABLE test_records ADD COLUMN IF NOT EXISTS time_received TIMESTAMP'))
  .then(() => {
    console.log('Migration 005: time_received column added');
    return client.end();
  })
  .catch((err) => {
    console.error(err);
    client.end();
    process.exit(1);
  });
