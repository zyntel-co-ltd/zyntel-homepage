-- Multiple contact emails per client (JSON array of strings)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS emails JSONB;

UPDATE clients
SET emails = jsonb_build_array(email)
WHERE emails IS NULL;
