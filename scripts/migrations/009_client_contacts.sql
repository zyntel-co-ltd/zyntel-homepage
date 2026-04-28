-- Client contacts (optional): store named contacts, default email derives from default contact
ALTER TABLE clients ADD COLUMN IF NOT EXISTS contacts JSONB;

-- Backfill contacts from existing emails when contacts missing
UPDATE clients
SET contacts = (
  SELECT jsonb_agg(jsonb_build_object(
    'name', NULL,
    'email', e,
    'phone', NULL,
    'isDefault', (idx = 0)
  ))
  FROM (
    SELECT value::text AS e, ordinality - 1 AS idx
    FROM jsonb_array_elements_text(COALESCE(clients.emails, jsonb_build_array(clients.email))) WITH ORDINALITY
  ) x
)
WHERE contacts IS NULL;

