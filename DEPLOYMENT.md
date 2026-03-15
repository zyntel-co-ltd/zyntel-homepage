# Monorepo Deployment Guide — Zyntel Homepage & Admin

This guide covers deploying the monorepo to Vercel with two separate projects. Follow the steps in order.

---

## Prerequisites

- Node.js 24.x
- Vercel CLI (`npm i -g vercel`)
- Access to Vercel dashboard (zyntel-co-ltd scope)
- Cloudflare DNS for zyntel.net
- Cloudflare Zero Trust (for admin protection)

---

## Phase 1 — Local Verification (Before Pushing)

Run these commands from the repo root (`f:\zyntel\zyntel-co-ltd\zyntel-homepage`):

```powershell
# 1. Install all workspace dependencies
npm install

# 2. Verify web app
cd apps/web
npm run dev
# Open http://localhost:4321 — homepage, contact form, blog, products should work
# Ctrl+C to stop

# 3. Verify admin app
cd ../admin
npm run dev
# Open http://localhost:4321 — login page at /login, dashboard at /
# Ctrl+C to stop

# 4. Build both (optional but recommended)
cd ..
npm run build -w zyntel-homepage
npm run build -w zyntel-admin
```

Fix any broken imports or build errors before pushing. Do not proceed until both apps run cleanly.

---

## Phase 2 — Update Existing Vercel Project (zyntel-homepage)

Your existing `zyntel-homepage` project currently points at the repo root. Update it to use `apps/web`:

1. **Vercel Dashboard** → [vercel.com](https://vercel.com) → `zyntel-co-ltd` → `zyntel-homepage`
2. **Settings** → **General**
3. **Root Directory** → change from `.` to `apps/web`
4. **Save**

Vercel will trigger a redeploy. Watch the build logs. If it succeeds, your web app is running from the monorepo. Domains (`zyntel.net`, `www.zyntel.net`, `preview.zyntel.net`) continue working without DNS changes.

If the build fails, fix the issue before creating the admin project.

---

## Phase 3 — Create Admin Vercel Project via CLI

From the repo root:

```powershell
cd f:\zyntel\zyntel-co-ltd\zyntel-homepage

vercel
```

At the prompts:

| Prompt | Answer |
|--------|--------|
| Set up and deploy? | **Yes** |
| Which scope? | **zyntel-co-ltd** |
| Link to existing project? | **No** |
| Project name? | **zyntel-admin** |
| In which directory is your code located? | **./apps/admin** |

Vercel creates the `zyntel-admin` project and runs the first build. A `.vercel/project.json` is created inside `apps/admin/` linking it. Your existing `.vercel/project.json` at the repo root (or in `apps/web`) links `zyntel-homepage` — they coexist.

---

## Phase 4 — Configure Admin Project

### Environment Variables

**Vercel Dashboard** → `zyntel-admin` → **Settings** → **Environment Variables**

Add these (Production + Preview unless noted):

| Variable | Value | Notes |
|---------|-------|-------|
| `DATABASE_URL` | Neon **write-access** connection string | Admin needs full DB access |
| `INVOICE_API_KEY` | Your admin secret | Same as before |
| `GMAIL_USER` | invoices@zyntel.net | |
| `GMAIL_APP_PASSWORD` | App Password for invoicing | Label: "Zyntel Admin — Invoicing" |
| `EMAIL_FROM` | Zyntel Invoices \<invoices@zyntel.net\> | |
| `FLW_SECRET_KEY` | Flutterwave secret key | If using Flutterwave |
| `FLW_WEBHOOK_HASH` | Webhook signature verification | If using Flutterwave |
| `SITE_URL` | https://admin.zyntel.net | Production; use https://admin-preview.zyntel.net for Preview |

The `zyntel-homepage` project never sees these. Isolation is intentional.

### Domains

**Vercel Dashboard** → `zyntel-admin` → **Settings** → **Domains** → **Add**:

- `admin.zyntel.net` → **Production**
- `admin-preview.zyntel.net` → **Preview**

---

## Phase 5 — Cloudflare DNS

Add CNAME records in Cloudflare for `zyntel.net`:

| Type | Name | Target | Proxy |
|------|------|--------|-------|
| CNAME | admin | cname.vercel-dns.com | **Proxied (orange cloud)** |
| CNAME | admin-preview | cname.vercel-dns.com | **Proxied (orange cloud)** |

Both must be **proxied** so Cloudflare Zero Trust can intercept traffic before it reaches Vercel.

---

## Phase 6 — Cloudflare Zero Trust for Admin

**Zero Trust Dashboard** → **Access** → **Applications** → **Add an Application** → **Self-hosted**:

| Field | Value |
|-------|-------|
| Application name | Zyntel Admin Panel |
| Application domain | admin.zyntel.net |
| Session duration | 8 hours |
| Policy name | Founding Team |
| Rule type | Emails |
| Emails | [your email], [CTO email], [COO email] |

Repeat for `admin-preview.zyntel.net` with the same policy.

Test in an incognito window — the Cloudflare login gate should appear before the admin UI loads.

---

## Phase 7 — Web Project Environment Variables

Ensure `zyntel-homepage` has:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Read/write for leads, contact_submissions, payment_events |
| `PUBLIC_SANITY_*` | Sanity CMS |
| `GMAIL_USER`, `GMAIL_APP_PASSWORD` | Contact form (if same as admin, or separate) |
| `FLW_SECRET_KEY`, `FLW_WEBHOOK_HASH` | Product payments |
| `SITE` or `SITE_URL` | https://zyntel.net (production), https://preview.zyntel.net (preview) |

Admin-specific vars (`INVOICE_API_KEY`, invoicing Gmail, etc.) stay only in `zyntel-admin`.

---

## Final Architecture

```
GitHub: zyntel-co-ltd/zyntel-homepage
│
├── Vercel: zyntel-homepage (Root: apps/web)
│   ├── Domains: zyntel.net, www.zyntel.net, preview.zyntel.net
│   ├── Env: Sanity, Gmail contact form, read/write DATABASE_URL (leads, contact, payment_events)
│   └── Deploys independently — web changes never touch admin
│
└── Vercel: zyntel-admin (Root: apps/admin)
    ├── Domains: admin.zyntel.net, admin-preview.zyntel.net
    ├── Env: INVOICE_API_KEY, FLW_*, write DATABASE_URL (isolated)
    ├── Cloudflare Zero Trust on both domains
    └── Deploys independently — admin changes never touch web
```

---

## Troubleshooting

### Record payment 500: "invoices_status_check" constraint

If recording a payment returns 500 with `violates check constraint "invoices_status_check"`, run migration 006 in Neon SQL Editor:

```sql
-- scripts/migrations/006_invoice_status_partial.sql
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_status_check
  CHECK (status IN ('draft', 'sent', 'partial', 'paid', 'overdue', 'cancelled'));
```

### Build fails: "Cannot find module '@zyntel/db'"

Ensure `npm install` was run from the **repo root**. Workspaces link `packages/db` automatically.

### Admin build: "astro is not recognized"

Run `npm install` from the repo root first. Then `cd apps/admin && npm run build`.

### Vercel build: Root Directory & Install

- `zyntel-homepage` → Root Directory: `apps/web`, Install Command: `cd ../.. && npm install`
- `zyntel-admin` → Root Directory: `apps/admin`, Install Command: `cd ../.. && npm install`

The install runs from the monorepo root so workspaces (including `@zyntel/db`) are linked correctly.

### Redirects

`zyntel.net/admin` and `preview.zyntel.net/admin` redirect to `admin.zyntel.net` and `admin-preview.zyntel.net` respectively. Configured in `apps/web/vercel.json`.

### Cloudflare Zero Trust — Not asking for email

If you reach the admin UI without seeing the Cloudflare login gate:

1. **DNS must be Proxied (orange cloud)**  
   Cloudflare Dashboard → DNS → Records. For `admin` and `admin-preview`, the proxy status must be **Proxied** (orange cloud). If it is **DNS only** (grey cloud), traffic goes straight to Vercel and bypasses Cloudflare. Zero Trust only runs when traffic passes through Cloudflare.

2. **Use the correct URL**  
   Zero Trust applies only to `admin.zyntel.net` and `admin-preview.zyntel.net`. The Vercel URL (e.g. `zyntel-admin-xxx.vercel.app`) does **not** go through Cloudflare, so you will not see the login gate there.

3. **Application domain must match**  
   Zero Trust Dashboard → Access → Applications. The Application domain must be exactly `admin.zyntel.net` (no trailing slash, no `www`). Add a separate application for `admin-preview.zyntel.net` if you use it.

4. **Policy must be active**  
   Ensure the Access policy (e.g. "Founding Team") is attached to the application and not disabled.

5. **Bypass rules**  
   Check Access → Settings → Bypass. If your IP or a range is in the bypass list, you will not be challenged.

6. **Cache / incognito**  
   Try an incognito/private window or clear cookies for `*.zyntel.net` and `*.cloudflareaccess.com`.
