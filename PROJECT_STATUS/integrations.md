# Zyntel Homepage — Integrations

**Last updated:** 2026-04-17

---

## Infrastructure

| Service | Role |
|---------|------|
| Vercel | Hosting for Astro monorepo (site + admin) |
| Neon | PostgreSQL serverless — all admin data |
| Sanity CMS | Content for marketing pages |
| Cloudflare Workers | Scheduled tasks (health pinger, ROI cron) |

---

## Email

| Service | Role |
|---------|------|
| Resend | Transactional email — invoice PDFs, quote PDFs, health alerts |
| `RESEND_API_KEY` env var | Required in both admin app and Workers |

---

## PDF Generation

| Library | Role |
|---------|------|
| `pdf-lib` | Invoice PDFs, quote PDFs, maintenance report PDFs |

---

## Cloudflare Workers

| Worker | Trigger | Secrets Needed |
|--------|---------|----------------|
| `zyntel-health-pinger` | `*/5 * * * *` | `DATABASE_URL`, `RESEND_API_KEY` |
| `zyntel-roi-snapshot` | `0 0 * * *` | `DATABASE_URL`, `RESEND_API_KEY` |

Deploy via: `wrangler deploy` (see `wrangler.toml` in repo root)

---

## External APIs Consumed

| Service | Where Used | Notes |
|---------|-----------|-------|
| Zyntel Internal API (`/zyntel/v1`) | `roi-snapshot-cron.js` Worker | Pulls TAT/volume/delay/revenue from Nakasero |
| Service client `health_check_url`s | `health-pinger.js` Worker | Simple HTTP GET pings |
