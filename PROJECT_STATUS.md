# Zyntel Homepage — Project Status & Functional Specification

**Last updated:** 2026-03-27  
**Updated by:** Cursor  
**Product type:** Marketing / company site + tooling in monorepo  
**Production URL:** zyntel.net (see Domains below)  
**Repo:** https://github.com/zyntel-co-ltd/zyntel-homepage  
**Stack:** Astro 5, Vercel, Neon PostgreSQL, Sanity CMS  

This document follows **`knowledge` → `zyntel-playbook/05-infrastructure/project-status-file.md`**. Expand **Section 5** with **Feature** blocks for CMS-driven pages, invoicing PDFs, and any interactive flows.

---

## Repo map (high-signal)

Generated from a `repomix --no-files` snapshot (paths only). **No secrets or file contents** are included here.

### Top-level

```text
.astro/
.cursor/
.github/
apps/
packages/
scripts/
```

### Key entrypoints

```text
.env.example
package.json
PROJECT_STATUS.md
```

## Recent Changes (March 2026)

- **Invoice/Receipt PDFs:** Text wrapping for descriptions and notes (no clipping); unique receipt numbers per installment (`RCT-INV-xxx-P{id}`); descriptive document titles and filenames; footer removed.
- **Custom cursor:** Theme-aware visibility — light mode uses dark teal (`#006064`) for contrast on light backgrounds; dark mode unchanged.

---

## Domains (Vercel)

### Current + New — You Keep All

Adding `admin.zyntel.net` and `admin-preview.zyntel.net` does **not** remove any existing domains. You will have:

| Domain | Deployment | Purpose |
|--------|------------|---------|
| `zyntel.net` | Production | Main site (307 redirect) |
| `www.zyntel.net` | Production | Main site |
| `zyntel-homepage.vercel.app` | Production | Vercel default |
| `preview.zyntel.net` | Preview (development) | Main site for PRs/branches |
| `admin.zyntel.net` | Production | Admin panel at root |
| `admin-preview.zyntel.net` | Preview | Admin panel at root |

**Action required:** Add `admin.zyntel.net` and `admin-preview.zyntel.net` in Vercel → Settings → Domains, then add DNS CNAME records.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Astro 5.x |
| Hosting | Vercel (serverless) |
| Database | Neon PostgreSQL |
| CMS | Sanity |
| Email | Gmail SMTP (Nodemailer) |
| PDF | pdf-lib |
| Node | 24.x |

---

## Project Structure (Monorepo)

```
zyntel-homepage/
├── apps/
│   ├── web/              # zyntel-homepage Vercel project
│   │   ├── src/
│   │   │   ├── components/   # Shared UI (Nav, Footer, forms, etc.)
│   │   │   ├── layouts/      # BaseLayout
│   │   │   ├── lib/         # sanity.ts (db, email, invoice-pdf in admin)
│   │   │   ├── pages/
│   │   │   │   ├── api/     # contact, newsletter, payments, webhooks
│   │   │   │   ├── blog/    # Blog (Sanity)
│   │   │   │   ├── products/ # Products (Sanity)
│   │   │   │   ├── policy/  # Policy pages
│   │   │   │   └── *.astro  # Public pages
│   │   │   └── styles/
│   │   └── public/
│   └── admin/            # zyntel-admin Vercel project
│       ├── src/
│       │   ├── layouts/   # AdminLayout
│       │   ├── lib/       # db (via @zyntel/db), email, invoice-pdf
│       │   ├── pages/
│       │   │   ├── api/   # invoices, clients, payment-accounts, receipts
│       │   │   ├── invoices/, clients/, banks/
│       │   │   ├── login.astro, index.astro
│       │   │   └── ...
│       │   └── styles/
│       └── public/
├── packages/
│   └── db/               # Shared Neon client, types, schema (@zyntel/db)
├── scripts/migrations/   # SQL migrations for Neon
├── sanity/               # Sanity schema and config
└── docs/                 # INVOICING.md, ADMIN_SETUP.md
```

---

## API Routes

### Web App (apps/web) — Public

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/contact` | Contact form |
| POST | `/api/newsletter` | Newsletter signup |
| POST | `/api/payments/create` | Flutterwave payment |
| POST | `/api/webhooks/flutterwave` | Flutterwave webhook |

### Admin App (apps/admin) — Require `x-api-key: INVOICE_API_KEY`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/invoices/list` | List invoices |
| POST | `/api/invoices/create` | Create draft invoice |
| GET | `/api/invoices/[id]` | Get invoice + payments |
| PATCH | `/api/invoices/[id]/update` | Update draft only |
| POST | `/api/invoices/[id]/finalize` | Draft → sent |
| POST | `/api/invoices/[id]/record-payment` | Record payment |
| GET | `/api/invoices/[id]/pdf` | Download PDF (finalized only) |
| POST | `/api/invoices/[id]/send` | Email invoice (finalized only) |
| GET | `/api/clients/list` | List saved clients |
| POST | `/api/clients/create` | Create client |
| GET | `/api/payment-accounts/list` | List bank accounts |
| POST | `/api/payment-accounts/create` | Create bank account |
| GET | `/api/receipts/[id]/pdf` | Receipt PDF |
| POST | `/api/receipts/[id]/send` | Email receipt |

---

## Database (Neon)

### Migrations (run in order)

1. `scripts/init-db.sql` — Base tables (leads, contact_submissions, payment_events)
2. `scripts/migrations/002_invoices.sql` — invoices, payment_records
3. `scripts/migrations/003_payment_accounts.sql` — payment_accounts, invoices.payment_account_id
4. `scripts/migrations/004_clients.sql` — clients, invoices.client_id
5. `scripts/migrations/005_invoice_extensions.sql` — invoice_type, recurring_config
6. `scripts/migrations/006_invoice_status_partial.sql` — partial status for installments
7. `scripts/migrations/007_invoice_soft_delete.sql` — deleted_at for soft delete

### Tables

- **invoices** — Draft/sent/paid, line items (JSONB), client details
- **payment_records** — Per-invoice payments (cash, bank, mobile money, etc.)
- **payment_accounts** — Bank details for invoice PDFs
- **clients** — Saved clients for reuse

---

## Admin Panel

### URLs

- **Production:** `admin.zyntel.net` (no `/admin` path)
- **Preview:** `admin-preview.zyntel.net`
- **Redirects:** `zyntel.net/admin` → `admin.zyntel.net`, `preview.zyntel.net/admin` → `admin-preview.zyntel.net`

### Features

- Dashboard (stats, recent invoices)
- Invoices: create, edit (drafts only), finalize, send, download PDF, record payment
- Clients: list (saved via "Save client" on create)
- Bank accounts: manage payment details per invoice
- Auth: API key in sessionStorage

### Security

- `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy` on admin domains
- `noindex, nofollow` on admin pages
- See `docs/ADMIN_SETUP.md` for enterprise practices

---

## Environment Variables (Vercel)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon connection string |
| `INVOICE_API_KEY` | Yes (admin) | Secret for admin + API auth |
| `GMAIL_USER` | Yes (send) | e.g. noreply@zyntel.net |
| `GMAIL_APP_PASSWORD` | Yes (send) | 16-char App Password |
| `SITE_URL` | No | Production: zyntel.net, Preview: preview.zyntel.net |
| `EMAIL_FROM` | No | Zyntel \<invoices@zyntel.net\> |
| `PUBLIC_SANITY_*` | Yes (CMS) | Sanity project/dataset |
| `FLW_*` | No | Flutterwave (payments) |
| `INVOICE_BANK_*` | No | Fallback bank details |

---

## Vercel Config

- **zyntel-homepage** (apps/web): Redirects `/admin` → admin.zyntel.net on zyntel.net and preview.zyntel.net
- **zyntel-admin** (apps/admin): Security headers (X-Frame-Options, X-Content-Type-Options, noindex, etc.). Admin is a separate project; no rewrites needed.

---

## Invoice Flow

1. **Create** (draft) — Client, line items, tax, bank, save client option
2. **Edit** — Drafts only
3. **Finalize** — Draft → sent (read-only, can download/send)
4. **Send** — Email with PDF (Gmail)
5. **Record payment** — Cash, bank, mobile money, etc.
6. **Receipt** — PDF + email per payment

---

## Docs

- `docs/INVOICING.md` — Setup, API, cURL examples
- `docs/ADMIN_SETUP.md` — Domain setup, security, optional separate repo
