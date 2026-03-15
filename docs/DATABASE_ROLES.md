# Database Roles — Neon Setup for Zyntel Homepage

This document explains how to set up the `zyntel_web_ro` database role in Neon for the homepage Vercel project. The homepage app needs limited write access (INSERT only on specific tables), not full read-only access.

## Why a Restricted Role?

- **Security:** If the homepage is compromised, an attacker cannot read or modify invoices, clients, or payment records.
- **Principle of least privilege:** The web app only needs to insert leads, contact submissions, and payment events.

## Tables the Homepage Uses

| Table | Operations | Purpose |
|-------|------------|---------|
| `leads` | INSERT | Newsletter signup form |
| `contact_submissions` | INSERT | Contact form |
| `payment_events` | INSERT | Flutterwave webhook (product payments) |

The homepage does **not** need access to: `invoices`, `clients`, `payment_accounts`, `payment_records`, `saved_items`.

## Setup in Neon

### 1. Create the Role

In Neon SQL Editor (or `psql` connected to your Neon database):

```sql
CREATE ROLE zyntel_web_ro WITH LOGIN PASSWORD 'your-secure-password';
```

### 2. Grant Permissions

```sql
-- SELECT + INSERT on tables the web app writes to
GRANT SELECT, INSERT ON leads TO zyntel_web_ro;
GRANT SELECT, INSERT ON contact_submissions TO zyntel_web_ro;
GRANT SELECT, INSERT ON payment_events TO zyntel_web_ro;

-- Required for INSERT with SERIAL/identity columns
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO zyntel_web_ro;
```

### 3. Get the Connection String

1. **Neon Dashboard** → your project → **Connection Details**
2. Use the connection string format and replace the username with `zyntel_web_ro` and the password with the one you set:

   ```
   postgresql://zyntel_web_ro:YOUR_PASSWORD@ep-xxx-xxx.region.aws.neon.tech/neondb?sslmode=require
   ```

3. Or: **Connection string** → **Role** dropdown → if `zyntel_web_ro` appears, select it and copy the string.

### 4. Configure Vercel

1. **Vercel Dashboard** → `zyntel-homepage` project → **Settings** → **Environment Variables**
2. Add or update `DATABASE_URL` with the `zyntel_web_ro` connection string
3. Apply to **Production** and **Preview**
4. Redeploy the project for changes to take effect

## Admin Project

The `zyntel-admin` project uses the **default owner** connection string with full database access. Do not use `zyntel_web_ro` for the admin project — it needs read/write access to invoices, clients, payment accounts, etc.

## Troubleshooting

- **"permission denied for table X"** — Ensure the role has `INSERT` on the table and `USAGE, SELECT` on sequences.
- **"relation does not exist"** — The role may need `USAGE` on the schema: `GRANT USAGE ON SCHEMA public TO zyntel_web_ro;`
- **Connection refused** — Verify the connection string, SSL mode (`sslmode=require`), and that the Neon project is active.
