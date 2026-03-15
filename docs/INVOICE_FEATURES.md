# Invoice Features — Past Dates, Saved Items, Recurring

## Migration Required

Run the new migration in Neon SQL Editor:

```
scripts/migrations/005_invoice_extensions.sql
```

This adds: `invoice_date`, `invoice_type`, `recurring_config`, and the `saved_items` table.

---

## 1. Past Dates

### Invoice date
- **Create/Edit**: Set "Invoice date" to backdate an invoice (default: today).
- **PDF**: The date shown on the invoice uses `invoice_date` when set.

### Payment date (receipts)
- **Record payment**: Use the "Payment date" field in the modal (default: today).
- Receipts use this date for the paid-at timestamp.

---

## 2. Saved Items

- **Items** page: Add reusable line items (name, description, unit price, default quantity).
- **New/Edit invoice**: Use "Add from saved items" to insert items quickly.
- Useful for recurring services (e.g. "Monthly hosting", "Consultation hour").

---

## 3. Invoice Types

- **One-off**: Single transaction (default).
- **Subscription**: Recurring monthly (or quarterly/yearly).
- **Consultation**: For filtering/reporting.
- **Other**: Catch-all.

Filter invoices by type on the dashboard.

---

## 4. Recurring Invoices (Subscriptions)

### Setup
1. Create an invoice with type **Subscription**.
2. Set **Recurring (next invoice date)** to when the next invoice should be created (e.g. 1st of next month).
3. Finalize and send the invoice.

### How it works
- A **cron job** runs daily at 09:00 UTC.
- It finds subscription invoices where `next_run` ≤ today.
- Creates a new draft invoice (same client, items, tax, bank).
- Updates the source invoice’s `next_run` to the next period.

### Vercel Cron
- Cron is configured in `apps/admin/vercel.json`.
- Add `CRON_SECRET` to the admin project’s env vars (Vercel sets this for cron invocations).
- **Vercel Pro** required for Cron. Without Pro, use an external cron (e.g. cron-job.org).

### Manual trigger
Call the endpoint to run it manually:

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://admin.zyntel.net/api/cron/recurring-invoices
```

---

## Receipt Flow (Reminder)

1. Create invoice (draft)
2. Finalize invoice
3. (Optional) Send invoice
4. Record payment(s) — each creates a receipt
5. Download PDF or email receipt per payment

Receipts are tied to payments; payments are tied to invoices.
