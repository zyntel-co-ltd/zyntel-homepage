-- ============================================================================
-- Migration 007: Metrics tables for aggregated data (3.4)
-- ============================================================================
-- Enables data purging of raw records while retaining aggregated metrics
-- for longer-term reporting.
-- ============================================================================

-- Daily metrics: revenue, test counts, TAT, etc. per day
CREATE TABLE IF NOT EXISTS daily_metrics (
  id SERIAL PRIMARY KEY,
  metric_date DATE NOT NULL,
  lab_section VARCHAR(100),
  shift VARCHAR(20),
  laboratory VARCHAR(50),
  total_revenue DECIMAL(15,2) DEFAULT 0,
  test_count INTEGER DEFAULT 0,
  request_count INTEGER DEFAULT 0,
  on_time_count INTEGER DEFAULT 0,
  delayed_count INTEGER DEFAULT 0,
  cancelled_count INTEGER DEFAULT 0,
  avg_tat_minutes NUMERIC DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(metric_date, lab_section, shift, laboratory)
);

CREATE INDEX IF NOT EXISTS idx_daily_metrics_date ON daily_metrics(metric_date);
CREATE INDEX IF NOT EXISTS idx_daily_metrics_lab_section ON daily_metrics(lab_section);
CREATE INDEX IF NOT EXISTS idx_daily_metrics_laboratory ON daily_metrics(laboratory);

-- Monthly metrics: same structure, monthly granularity
CREATE TABLE IF NOT EXISTS monthly_metrics (
  id SERIAL PRIMARY KEY,
  metric_month INTEGER NOT NULL CHECK (metric_month BETWEEN 1 AND 12),
  metric_year INTEGER NOT NULL,
  lab_section VARCHAR(100),
  shift VARCHAR(20),
  laboratory VARCHAR(50),
  total_revenue DECIMAL(15,2) DEFAULT 0,
  test_count INTEGER DEFAULT 0,
  request_count INTEGER DEFAULT 0,
  on_time_count INTEGER DEFAULT 0,
  delayed_count INTEGER DEFAULT 0,
  cancelled_count INTEGER DEFAULT 0,
  avg_tat_minutes NUMERIC DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(metric_year, metric_month, lab_section, shift, laboratory)
);

CREATE INDEX IF NOT EXISTS idx_monthly_metrics_year_month ON monthly_metrics(metric_year, metric_month);
