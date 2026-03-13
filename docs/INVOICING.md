# Invoicing & Receipts

Send invoices to clients and issue receipts after payment. Supports **cash**, **bank transfer**, **mobile money**, and other methods—no Flutterwave required.

---

## Vercel Setup (Preview Deployments)

### 1. Run the database migrations

In **Neon** → your project → **SQL Editor**, run in order:
1. `scripts/migrations/002_invoices.sql`
2. `scripts/migrations/003_payment_accounts.sql`

### 2. Add environment variables in Vercel

1. Go to [vercel.com](https://vercel.com) → your project → **Settings** → **Environment Variables**
2. Add these (enable for **Preview** and **Production**):

| Variable | Value |
|----------|-------|
| `INVOICE_API_KEY` | A secret string (e.g. generate with `openssl rand -hex 32`) |
| `GMAIL_USER` | Your Gmail address |
| `GMAIL_APP_PASSWORD` | 16-char App Password from [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) |
| `EMAIL_FROM` | `Zyntel <invoices@zyntel.net>` (optional) |
| `INVOICE_BANK_*` | Fallback when no bank selected per invoice (optional if using Bank accounts) |

**Bank accounts:** Use **Admin → Bank accounts** to add multiple banks. When creating an invoice, choose which bank's details to show. This overrides the env vars above.

**Gmail:** `GMAIL_USER` and `GMAIL_APP_PASSWORD` must be **two separate** env vars. Enable [2-Step Verification](https://myaccount.google.com/security), then create an [App Password](https://myaccount.google.com/apppasswords) for "Mail". For `noreply@zyntel.net`, use that exact address as `GMAIL_USER` and create the App Password for that account. **403** = wrong credentials or App Password not created for that account.

**Vercel Deployment Protection:** If you see 403 with "Cross-site" or "Cross-Origin" when sending invoices, Vercel's password protection may be blocking API requests. Either disable Deployment Protection for the project, or ensure you visit and use the **same URL** (e.g. your custom domain) for both the admin UI and API calls—don't mix preview URLs with production.

3. Ensure `DATABASE_URL` is already set (from Neon integration or manual).

### 3. Deploy

Push to your branch or open a PR. Vercel will build a preview. Your base URL will be something like:

- Preview: `https://zyntel-homepage-xxx-yourteam.vercel.app`
- Production: `https://zyntel.net` (or your custom domain)

---

## Admin UI

A production-ready dashboard is available at **`/admin`**.

1. Go to `https://YOUR_PREVIEW_URL/admin`
2. Sign in with your `INVOICE_API_KEY`
3. Use the dashboard to:
   - View stats (total, pending, paid, overdue)
   - Create invoices with line items
   - Record payments (cash, bank transfer, mobile money, etc.)
   - Send invoices and receipts by email
   - Download PDFs

---

## How to Record a Payment (API / cURL)

Use the API from any tool that can send HTTP requests. Replace `YOUR_PREVIEW_URL` and `YOUR_INVOICE_API_KEY` with your values.

### Step 1: List invoices to get the invoice ID

```bash
curl "https://YOUR_PREVIEW_URL/api/invoices/list?limit=10" \
  -H "x-api-key: YOUR_INVOICE_API_KEY"
```

Note the `id` of the invoice you want to record a payment for.

### Step 2: Record the payment

```bash
curl -X POST "https://YOUR_PREVIEW_URL/api/invoices/INVOICE_ID/record-payment" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_INVOICE_API_KEY" \
  -d '{
    "amount": 600000,
    "payment_method": "cash",
    "reference": "Cash received at office"
  }'
```

**payment_method** options: `cash`, `bank_transfer`, `mobile_money`, `flutterwave`, `cheque`, `other`

The response includes `paymentId`. Use it to send the receipt or download the PDF.

### Step 3: Send receipt (optional)

```bash
curl -X POST "https://YOUR_PREVIEW_URL/api/receipts/PAYMENT_ID/send" \
  -H "x-api-key: YOUR_INVOICE_API_KEY"
```

Or download the receipt PDF (no auth):

```
https://YOUR_PREVIEW_URL/api/receipts/PAYMENT_ID/pdf
```

**On Windows (PowerShell):** Use `curl.exe` instead of `curl`, or:

```powershell
Invoke-RestMethod -Uri "https://YOUR_PREVIEW_URL/api/invoices/1/record-payment" `
  -Method POST -Headers @{ "x-api-key" = "YOUR_INVOICE_API_KEY"; "Content-Type" = "application/json" } `
  -Body '{"amount":600000,"payment_method":"cash","reference":"Cash received"}'
```

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `INVOICE_API_KEY` | Yes* | Secret key for API auth. Use a random string. |
| `GMAIL_USER` | For email | Your Gmail address |
| `GMAIL_APP_PASSWORD` | For email | [App Password](https://myaccount.google.com/apppasswords) (enable 2FA first) |
| `EMAIL_FROM` | Optional | Sender display, e.g. `Zyntel <invoices@zyntel.net>` |

\* If `INVOICE_API_KEY` is not set, the API has no auth (not recommended for production).

---

## API Reference

Base URL: `https://your-site.vercel.app/api`

All create/record/send/list endpoints require the header:
```
x-api-key: YOUR_INVOICE_API_KEY
```
or
```
Authorization: Bearer YOUR_INVOICE_API_KEY
```

### Create invoice

```
POST /api/invoices/create
Content-Type: application/json
x-api-key: YOUR_KEY

{
  "client_name": "Acme Ltd",
  "client_email": "billing@acme.com",
  "client_phone": "+256...",
  "client_address": "Kampala, Uganda",
  "items": [
    { "description": "Zyntel Inventory System License", "quantity": 1, "unitPrice": 500000 },
    { "description": "Support - 1 year", "quantity": 1, "unitPrice": 100000 }
  ],
  "tax_rate": 18,
  "currency": "UGX",
  "due_date": "2025-04-15",
  "notes": "Payment terms: 30 days"
}
```

### Record payment (cash, bank, etc.)

```
POST /api/invoices/123/record-payment
Content-Type: application/json
x-api-key: YOUR_KEY

{
  "amount": 600000,
  "payment_method": "cash",
  "reference": "Cash received at office",
  "paid_at": "2025-03-15T10:30:00Z"
}
```

**payment_method** options: `cash`, `bank_transfer`, `mobile_money`, `flutterwave`, `cheque`, `other`

### Download invoice PDF

```
GET /api/invoices/123/pdf
```
No auth required (invoice ID is hard to guess). Returns PDF file.

### Download receipt PDF

```
GET /api/receipts/456/pdf
```
Returns receipt for payment ID 456.

### Send invoice by email

```
POST /api/invoices/123/send
x-api-key: YOUR_KEY
```
Sends the invoice PDF to the client's email. Requires `GMAIL_USER` and `GMAIL_APP_PASSWORD`.

### Send receipt by email

```
POST /api/receipts/456/send
x-api-key: YOUR_KEY
```
Sends the receipt to the client. Requires `GMAIL_USER` and `GMAIL_APP_PASSWORD`.

### List invoices

```
GET /api/invoices/list?limit=50
x-api-key: YOUR_KEY
```

### Get invoice details (with payments)

```
GET /api/invoices/123
x-api-key: YOUR_KEY
```

---

## Workflow

### Manual invoice

1. **Create** invoice via `POST /api/invoices/create`
2. **Send** to client via `POST /api/invoices/{id}/send` (or share PDF link: `/api/invoices/{id}/pdf`)
3. Client pays (cash, bank, etc.)
4. **Record payment** via `POST /api/invoices/{id}/record-payment`
5. **Send receipt** via `POST /api/receipts/{paymentId}/send` (or share PDF link)

### Automatic receipt (when Flutterwave is set up)

Your existing Flutterwave webhook can call `record-payment` when a payment succeeds, then call the receipt send endpoint.

---

## Example: cURL

```bash
# Create invoice
curl -X POST https://zyntel.net/api/invoices/create \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_KEY" \
  -d '{"client_name":"John Doe","client_email":"john@example.com","items":[{"description":"License","quantity":1,"unitPrice":100000}]}'

# Record cash payment
curl -X POST https://zyntel.net/api/invoices/1/record-payment \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_KEY" \
  -d '{"amount":100000,"payment_method":"cash","reference":"Cash received"}'

# Download receipt PDF (no auth)
curl -o receipt.pdf "https://zyntel.net/api/receipts/1/pdf"
```
