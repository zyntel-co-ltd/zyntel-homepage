-- Drop all tables in public schema (run in psql: \i scripts/db-drop-all-tables.sql)
-- Or paste the DO block below into psql (do NOT paste lines starting with #)

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END $$;
