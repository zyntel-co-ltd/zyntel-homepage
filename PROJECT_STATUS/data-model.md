# Zyntel Homepage — Data Model

**Last updated:** 2026-04-17  
**Database:** Neon (PostgreSQL serverless)

---

## Existing Tables (pre-April 2026)

| Table | Purpose |
|-------|---------|
| `clients` | Invoicing clients |
| `invoices` | Invoices with line items (JSONB) |
| `payment_records` | Payment entries per invoice |
| `payment_accounts` | Bank account configs |
| `saved_items` | Reusable invoice line items |
| `preview_clients` | Design preview client access records |
| `preview_events` | Preview page analytics events |
| `preview_feedback_submissions` | Client feedback records |

---

## New Tables — April 2026

### Migration 010 — Quotes

| Table | Key Columns | Notes |
|-------|-------------|-------|
| `quotes` | `id UUID`, `quote_number TEXT`, `client_id INT FK`, `line_items JSONB`, `status TEXT`, `valid_until DATE` | Status: draft/sent/accepted/declined/converted |

Sequence: `quote_number_seq` → `Q-{YYYY}-{NNN}`

---

### Migration 011 — Maintenance

| Table | Key Columns | Notes |
|-------|-------------|-------|
| `service_clients` | `id UUID`, `name`, `product_name`, `product_type`, `health_check_url`, `api_url`, `api_key_hash` | Clients whose products we maintain |
| `work_orders` | `id UUID`, `wo_number`, `service_client_id FK`, `scope_items JSONB`, `status`, `estimated_cost` | Status: pending/approved/in-progress/completed/invoiced |
| `maintenance_logs` | `id UUID`, `service_client_id FK`, `log_date`, `type`, `area`, `summary`, `work_order_id FK` | Type: incident/preventive/support |

Sequence: `wo_number_seq` → `WO-{YYYY}-{NNN}`

---

### Migration 012 — Health Checks

| Table | Key Columns | Notes |
|-------|-------------|-------|
| `health_check_results` | `id UUID`, `service_client_id FK`, `checked_at TIMESTAMPTZ`, `status TEXT`, `response_time_ms INT`, `error_message TEXT` | Status: up/down/degraded. 30-day retention via cron. |

---

### Migration 013 — ROI Snapshots

| Table | Key Columns | Notes |
|-------|-------------|-------|
| `roi_snapshots` | `id UUID`, `service_client_id FK`, `snapshot_date DATE`, `metric_key TEXT`, `metric_value NUMERIC`, `source TEXT` | UNIQUE on (service_client_id, snapshot_date, metric_key). Source: api_pull/manual_entry |

**Standard metric keys:** `avg_tat_minutes`, `total_tests`, `delay_rate_pct`, `revenue_ugx`
