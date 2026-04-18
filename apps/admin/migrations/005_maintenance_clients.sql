-- Maintenance clients: apps built and maintained by Zyntel for external clients
CREATE TABLE IF NOT EXISTS maintenance_clients (
  id                  SERIAL PRIMARY KEY,
  name                TEXT NOT NULL,                        -- Client/business name e.g. "Five S Investments"
  contact_name        TEXT,                                 -- Primary contact person
  contact_email       TEXT,
  contact_phone       TEXT,
  app_name            TEXT NOT NULL,                        -- App name e.g. "Property Management System"
  app_url             TEXT,                                 -- Live deployment URL
  app_description     TEXT,
  tech_stack          TEXT,                                 -- e.g. "Django, PostgreSQL, Railway"
  status              TEXT NOT NULL DEFAULT 'active',       -- active | paused | churned
  monthly_retainer    NUMERIC(12,2) DEFAULT 0,              -- Monthly maintenance fee (0 if none)
  currency            TEXT NOT NULL DEFAULT 'UGX',
  start_date          DATE,                                 -- When Zyntel started maintaining this app
  original_dev_cost   NUMERIC(12,2),                        -- One-off development payment received
  client_id           INTEGER,                              -- FK to invoicing clients table (optional)
  metrics_api_url     TEXT,                                 -- Optional: URL that returns JSON metrics
  metrics_api_key     TEXT,                                 -- Optional: API key for the metrics endpoint
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Monthly metric snapshots for each maintenance client
CREATE TABLE IF NOT EXISTS app_metrics (
  id                          SERIAL PRIMARY KEY,
  maintenance_client_id       INTEGER NOT NULL REFERENCES maintenance_clients(id) ON DELETE CASCADE,
  period                      DATE NOT NULL,                -- First day of the month this snapshot covers
  -- Usage metrics (pulled from app or entered manually)
  active_users                INTEGER,
  active_tenants              INTEGER,
  total_properties            INTEGER,
  total_landlords             INTEGER,
  payments_recorded           INTEGER,
  -- Financial metrics (in the client's operating currency)
  revenue_tracked             NUMERIC(16,2),               -- Total rent/revenue processed through the app this month
  cumulative_revenue_tracked  NUMERIC(16,2),               -- Running total since go-live
  -- Estimated business impact
  hours_saved                 NUMERIC(6,1),                -- Estimated hrs saved vs manual process this month
  hourly_value                NUMERIC(10,2),               -- Estimated UGX value per hour saved
  -- Zyntel's revenue from this client this month
  zyntel_retainer_earned      NUMERIC(12,2),
  -- Flexible extension field for app-specific metrics
  custom                      JSONB,
  notes                       TEXT,
  recorded_by                 TEXT,                        -- Who entered this snapshot
  auto_synced                 BOOLEAN DEFAULT false,       -- true if pulled from metrics_api_url
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS app_metrics_client_period ON app_metrics(maintenance_client_id, period);
CREATE INDEX IF NOT EXISTS maintenance_clients_status ON maintenance_clients(status);
