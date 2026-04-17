# Zyntel Homepage — Admin API Routes

**Last updated:** 2026-04-17  
**Framework:** Astro (SSR), named exports (`export const GET`, `POST`, etc.)  
**Base:** `/api/`

---

## Invoicing

| Method | Path | Description |
|--------|------|-------------|
| GET/POST/PUT/DELETE | `/api/invoices/invoices` | Invoice CRUD |
| GET | `/api/invoices/pdf` | Download invoice PDF |
| POST | `/api/invoices/send-email` | Email invoice PDF via Resend |

## Previews

| Method | Path | Description |
|--------|------|-------------|
| GET/POST/PUT/DELETE | `/api/previews/clients` | Preview client CRUD |
| POST | `/api/previews/send-email` | Preview email |

## Quotes _(new — 2026-04-17)_

| Method | Path | Description |
|--------|------|-------------|
| GET/POST/PUT/DELETE | `/api/quotes/quotes` | Quote CRUD |
| PUT | `/api/quotes/status` | Update quote status |
| POST | `/api/quotes/convert` | Convert quote to invoice |
| GET | `/api/quotes/pdf` | Download quote PDF |
| POST | `/api/quotes/send-email` | Email quote PDF via Resend |

## Maintenance _(new — 2026-04-17)_

| Method | Path | Description |
|--------|------|-------------|
| GET/POST/PUT/DELETE | `/api/maintenance/clients` | Service client CRUD |
| GET/POST/DELETE | `/api/maintenance/logs` | Maintenance log CRUD |
| GET/POST/PUT/DELETE | `/api/maintenance/work-orders` | Work order CRUD |
| GET | `/api/maintenance/report-pdf` | Download quarterly report PDF |
| POST | `/api/maintenance/rotate-key` | Rotate service client API key |

## Health _(new — 2026-04-17)_

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health/history` | Last 24h check results for a service client |

## ROI Snapshots _(new — 2026-04-17)_

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/roi/snapshots` | Get/create ROI snapshots |
| GET | `/api/roi/comparison` | Period-over-period comparison |
