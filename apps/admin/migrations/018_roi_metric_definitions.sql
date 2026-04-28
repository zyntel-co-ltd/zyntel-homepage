-- Generic ROI metric registry for consistent dashboards.
CREATE TABLE IF NOT EXISTS roi_metric_definitions (
  key              TEXT PRIMARY KEY,
  label            TEXT NOT NULL,
  unit             TEXT,
  direction        TEXT NOT NULL DEFAULT 'higher_is_better'
    CHECK (direction IN ('higher_is_better','lower_is_better','neutral')),
  format           TEXT NOT NULL DEFAULT 'number'
    CHECK (format IN ('number','currency','percent','duration')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS roi_metric_definitions_label_idx ON roi_metric_definitions(label);

