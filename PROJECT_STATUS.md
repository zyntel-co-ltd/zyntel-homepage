# Zyntel Homepage — Project Status

**Last updated:** March 2026  
**Updated by:** Cursor  
**Stack:** Astro 5, Vercel, Neon PostgreSQL, Sanity CMS

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

## Project Structure

```
zyntel-homepage/
├── src/
│   ├── components/       # Shared UI (Nav, Footer, forms, etc.)
│   ├── layouts/          # BaseLayout, AdminLayout
│   ├── lib/              # db.ts, email.ts, invoice-pdf.ts, sanity.ts
│   ├── pages/
│   │   ├── admin/        # Admin UI (dashboard, invoices, clients, banks)
│   │   ├── api/          # API routes
│   │   ├── blog/         # Blog (Sanity)
│   │   ├── products/    # Products (Sanity)
│   │   ├── policy/      # Policy pages
│   │   └── *.astro      # Public pages (index, about, services, etc.)
│   └── styles/
├── scripts/migrations/   # SQL migrations for Neon
├── sanity/               # Sanity schema and config
├── public/               # Static assets, logos
└── docs/                 # INVOICING.md, ADMIN_SETUP.md
```

---

## API Routes

### Invoicing (require `x-api-key: INVOICE_API_KEY`)

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

### Public

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/contact` | Contact form |
| POST | `/api/newsletter` | Newsletter signup |
| POST | `/api/payments/create` | Flutterwave payment |
| POST | `/api/webhooks/flutterwave` | Flutterwave webhook |

---

## Database (Neon)

### Migrations (run in order)

1. `scripts/init-db.sql` — Base tables (leads, contact_submissions, payment_events)
2. `scripts/migrations/002_invoices.sql` — invoices, payment_records
3. `scripts/migrations/003_payment_accounts.sql` — payment_accounts, invoices.payment_account_id
4. `scripts/migrations/004_clients.sql` — clients, invoices.client_id

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

## Vercel Config (`vercel.json`)

- **Headers:** Security headers on admin.zyntel.net, admin-preview.zyntel.net
- **Redirects:** /admin → admin subdomains (zyntel.net, preview.zyntel.net)
- **Rewrites:** admin subdomains serve /admin at root, /api and /_astro pass through

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
