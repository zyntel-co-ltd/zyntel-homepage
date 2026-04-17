# Zyntel Homepage — Decisions

**Append-only.**

| Decision | What | Why | Date |
|----------|------|-----|------|
| Neon serverless for admin panel | `@neondatabase/serverless` for all DB access | Works in both Astro SSR (Node) and Cloudflare Workers (edge) | Prior |
| Astro SSR for admin panel | Server-rendered pages, not SPA | Auth pages, data fetching, no client bundle overhead | Prior |
| Migration re-numbering to 010+ | New migrations numbered 010–013 (not 002–005 as originally planned) | Migrations 001–009 already existed from previous dev sessions | 2026-04-17 |
| `service_clients` table separate from invoicing `clients` | Two distinct client tables | Maintenance/health clients are operational; invoicing clients are financial | 2026-04-17 |
| work_orders defined before maintenance_logs in migration | Table order in SQL file | FK dependency: maintenance_logs references work_orders | 2026-04-17 |
| Cloudflare Workers write directly to Neon | Workers use `@neondatabase/serverless` over HTTP | Workers cannot use TCP Postgres; Neon HTTP driver works in edge runtime | 2026-04-17 |
| API key stored as SHA-256 hash in service_clients | `api_key_hash` column | Never store plaintext API keys; plaintext returned only once on generation | 2026-04-17 |
| ROI metric keys as freeform TEXT | `metric_key TEXT` rather than an enum | Allows adding new metrics without migration; standard keys documented in spec | 2026-04-17 |
