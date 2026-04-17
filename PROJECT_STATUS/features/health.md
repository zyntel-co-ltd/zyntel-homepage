# Admin Panel — Health Monitor Feature

**Last updated:** 2026-04-17  
**Status:** Built

---

## What It Is

A live uptime grid for all deployed client products. Powered by a Cloudflare Worker that pings each product's health URL every 5 minutes and writes results to the `health_check_results` table.

---

## Pages & Routes

| File | Type | Purpose |
|------|------|---------|
| `apps/admin/src/pages/health/index.astro` | SSR page | Uptime grid |
| `apps/admin/src/pages/api/health/history.ts` | API | GET — last 24h results for a client |
| `workers/health-pinger.js` | CF Worker | Pings all health URLs every 5 min |
| `apps/admin/migrations/012_health_checks.sql` | Migration | `health_check_results` table |

---

## Health Grid

One card per service client showing:
- Product name
- Current status: `up` (green) / `degraded` (orange, response >2s) / `down` (red)
- Last checked timestamp
- Response time (ms)
- 7-day uptime %

Clicking a card shows last 24h of checks in a timeline modal.  
Page auto-refreshes every 60 seconds.

---

## Health Pinger Worker

File: `workers/health-pinger.js`  
Trigger: `*/5 * * * *`  
Actions:
1. Queries all `service_clients` with non-null `health_check_url`
2. HTTP GET to each URL (10s timeout)
3. Writes result to `health_check_results` (status, response_time_ms, status_code, error_message)
4. On transition to `down`: sends email alert to `ntale@zyntel.net` (cc Wycliff) via Resend

Secrets required: `DATABASE_URL`, `RESEND_API_KEY` (set via `wrangler secret put`)

---

## Data Retention

Results older than 30 days should be pruned:
```sql
DELETE FROM health_check_results WHERE checked_at < NOW() - INTERVAL '30 days';
```
(Run manually or add a second Cloudflare Worker cron.)
