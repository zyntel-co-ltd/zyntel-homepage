# Admin Panel — Maintenance Feature

**Last updated:** 2026-04-17  
**Status:** Built

---

## What It Is

Operational maintenance tracking for deployed client products. Covers three things:
1. **Maintenance logs** — quick diary of what was done (incident, preventive work, support)
2. **Work orders** — formal out-of-scope requests with approval workflow
3. **ROI snapshots** — metric capture for baseline/now comparison

---

## Pages & Routes

| File | Type | Purpose |
|------|------|---------|
| `apps/admin/src/pages/maintenance/index.astro` | SSR page | Full maintenance UI |
| `apps/admin/src/pages/api/maintenance/clients.ts` | API | Service client CRUD |
| `apps/admin/src/pages/api/maintenance/logs.ts` | API | Log CRUD + filters |
| `apps/admin/src/pages/api/maintenance/work-orders.ts` | API | Work order CRUD |
| `apps/admin/src/pages/api/maintenance/report-pdf.ts` | API | Quarterly report PDF |
| `apps/admin/src/pages/api/maintenance/rotate-key.ts` | API | API key rotation |
| `apps/admin/src/lib/maintenance.ts` | Lib | All DB operations |
| `apps/admin/src/lib/maintenance-report-pdf.ts` | Lib | PDF generation |
| `apps/admin/migrations/011_maintenance.sql` | Migration | `service_clients`, `work_orders`, `maintenance_logs` |

---

## Service Clients

A `service_client` is a client whose product Zyntel actively maintains. Fields include:
- `product_name`, `product_type` (dashboard / web-app / saas / other)
- `contact_name`, `contact_email`
- `health_check_url` — used by health pinger Worker
- `api_url`, `api_key_hash` — used by ROI cron Worker
- `api_key_hash` — SHA-256 of the plaintext key stored on the client's server

---

## Maintenance Logs

Quick-entry form (target: ≤3 clicks to submit). Types:
- `incident` — something broke
- `preventive` — planned maintenance
- `support` — client support activity

Fields: date, type (large clickable chip buttons), area, summary (≤200 chars), action taken, outcome.

---

## Work Orders

Numbered `WO-{YYYY}-{NNN}` via sequence `wo_number_seq`.  
Lifecycle: `pending` → `approved` → `in-progress` → `completed` → `invoiced`

---

## Quarterly Report PDF

`GET /api/maintenance/report-pdf?clientId=&quarter=Q2&year=2026`

Sections: Header, System availability, Incidents table, Preventive summary, Support activity, Work orders, Overall status, Zyntel footer.

---

## ROI Snapshots

Manual entry via "Log metrics" button per client. Standard metric keys:
- `avg_tat_minutes`
- `total_tests`
- `delay_rate_pct`
- `revenue_ugx`

Before vs Now comparison displayed inline on the maintenance page.

Data lib: `apps/admin/src/lib/roi.ts`  
APIs: `apps/admin/src/pages/api/roi/snapshots.ts`, `comparison.ts`
