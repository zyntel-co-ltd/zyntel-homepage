# Zyntel Homepage — Features

**Last updated:** 2026-04-17

---

## Marketing Site

- Company home, services, about, contact — Astro 5, Sanity CMS content
- Deployed on Vercel at zyntel.net

---

## Admin Panel (`apps/admin`)

### Invoicing
- Client management
- Invoice create / edit / PDF download / email send
- Payment records, bank accounts, saved line items
- Resend API for email delivery with PDF attachment

### Previews
- Preview client access management
- Design page preview URLs
- Feedback submissions tracking

### Pitches
- Pitch session management and tracking

### Quotes _(new — 2026-04-17)_
- Full quote lifecycle: draft → sent → accepted/declined → converted
- Auto-numbered quote IDs: `Q-{YYYY}-{NNN}`
- Line item editor (description, qty, unit price)
- PDF generation (branded, matches invoice style)
- Email sending with PDF attachment via Resend
- Convert accepted quote to invoice (one-click)
- Status management with filter tabs

### Maintenance _(new — 2026-04-17)_
- Service client registry (product, contact, URLs, API key hash)
- Maintenance log entry: incident / preventive / support
- Work orders: pending → approved → in-progress → completed → invoiced
- Auto-numbered WO IDs: `WO-{YYYY}-{NNN}`
- Quarterly maintenance report PDF
- API key rotation endpoint for service clients

### Health Monitor _(new — 2026-04-17)_
- Product uptime grid — all service clients at a glance
- Status badges: up / degraded / down
- Response time and last-checked display
- 7-day uptime percentage
- 24-hour history modal per client
- Auto-refreshes every 60 seconds

### ROI Snapshots _(new — 2026-04-17)_
- Manual metric entry per service client (avg TAT, volume, delay rate, revenue)
- Period-over-period comparison (current vs prior month)
- Automatic daily pull via ROI cron Worker from client APIs

---

## Cloudflare Workers (`workers/`)

| Worker | File | Trigger | Purpose |
|--------|------|---------|---------|
| `zyntel-health-pinger` | `workers/health-pinger.js` | Every 5 min | Ping all service client health URLs, write results, alert on down |
| `zyntel-roi-snapshot` | `workers/roi-snapshot-cron.js` | Daily 00:00 UTC | Pull `/zyntel/v1/snapshot` from client APIs, store to `roi_snapshots` |

Cron config: `wrangler.toml` in repo root.  
Secrets needed: `DATABASE_URL`, `RESEND_API_KEY`
