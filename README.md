# Zyntel Homepage (Astro)

The marketing site for **Zyntel** — a healthcare-focused web development agency building modern SaaS products and client solutions.

## Stack

- **Framework:** Astro — content-first, excellent performance
- **CMS:** Sanity — products, services (optional; falls back to hardcoded content)
- **Database:** Neon (PostgreSQL) — leads, contact submissions, payment events
- **Payments:** Flutterwave — Mobile Money, M-Pesa, cards (East Africa)
- **Hosting:** Vercel — serverless API routes + static pages

## Getting Started

```bash
npm install
cp .env.example .env   # Add your credentials
npm run dev
```

Open [http://localhost:4321](http://localhost:4321).

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PUBLIC_SANITY_PROJECT_ID` | Sanity project ID (sanity.io/manage) |
| `PUBLIC_SANITY_DATASET` | Sanity dataset (default: production) |
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `FLW_SECRET_KEY` | Flutterwave secret key |
| `FLW_VERIFY_HASH` | Flutterwave webhook verification hash |
| `SITE` | Public site URL (e.g. https://zyntel.net) |

## Sanity CMS

1. Create a project at [sanity.io/manage](https://sanity.io/manage)
2. Add `product` and `service` document types (schemas in `sanity/schemas/`)
3. Run Sanity Studio locally: `cd sanity && npm install && npm run dev`
4. Add products and services in the Studio
5. Set `PUBLIC_SANITY_PROJECT_ID` and `PUBLIC_SANITY_DATASET` in `.env`

Without Sanity configured, the site uses built-in fallback content.

## Neon Database

1. Create a project at [neon.tech](https://neon.tech) or use the Vercel integration
2. Run the schema: paste `scripts/init-db.sql` into the Neon SQL Editor
3. Add `DATABASE_URL` to your environment

## Flutterwave

1. Create an account at [flutterwave.com](https://flutterwave.com)
2. Add your webhook URL: `https://your-domain.com/api/webhooks/flutterwave`
3. Copy the secret key and verification hash to `.env`
4. Configure the redirect URL in the Flutterwave dashboard

## Build & Deploy

```bash
npm run build
```

Deploy to Vercel — the project uses the Vercel adapter for serverless API routes.
