# Admin Panel — Enterprise Setup

The admin panel uses a **separate subdomain** pattern common in enterprise deployments.

## Domain Structure

| Domain | Deployment | Purpose |
|--------|------------|---------|
| `zyntel.net` | Production | Main public site |
| `admin.zyntel.net` | Production | Admin panel (no `/admin` path) |
| `preview.zyntel.net` | Preview | Main site for development |
| `admin-preview.zyntel.net` | Preview | Admin panel for development |

## How It Works

- **Same repo, same build** — One Astro app deploys to all domains.
- **Vercel rewrites** — `admin.zyntel.net` and `admin-preview.zyntel.net` serve `/admin` at root.
- **Redirects** — `zyntel.net/admin` → `admin.zyntel.net`, `preview.zyntel.net/admin` → `admin-preview.zyntel.net`.

## Vercel Configuration

### 1. Add domains (Settings → Domains)

| Domain | Assign to |
|--------|-----------|
| `admin.zyntel.net` | Production |
| `admin-preview.zyntel.net` | Preview |

### 2. DNS

Add CNAME records at your registrar:

- `admin` → `cname.vercel-dns.com`
- `admin-preview` → `cname.vercel-dns.com` (or use Vercel’s suggested value)

## Security (Enterprise Practices)

### Implemented

- **Subdomain isolation** — Admin on its own subdomain, separate from the public site.
- **Security headers** — `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy` on admin domains.
- **No indexing** — `noindex, nofollow` on admin pages.
- **API key auth** — Admin uses `INVOICE_API_KEY` for API access.

### Recommended

1. **Vercel Deployment Protection** — Enable password protection for `admin-preview.zyntel.net` (Settings → Deployment Protection).
2. **IP allowlist** — Use Vercel Firewall or Cloudflare to restrict admin to office/VPN IPs.
3. **MFA** — If you add user accounts, require 2FA.
4. **Audit logging** — Log admin actions (future enhancement).
5. **Separate API key** — Use different `INVOICE_API_KEY` for preview vs production.

## Separate Repo (Optional)

To move admin to its own repo later:

1. Create `zyntel-admin` repo with a minimal Astro app.
2. Copy `src/pages/admin`, `src/layouts/AdminLayout.astro`, `src/styles/admin.css`.
3. Configure API base URL to `https://zyntel.net` (production) or `https://preview.zyntel.net` (preview).
4. Add CORS on the main site API for `admin.zyntel.net` and `admin-preview.zyntel.net`.
5. Deploy as a separate Vercel project.
