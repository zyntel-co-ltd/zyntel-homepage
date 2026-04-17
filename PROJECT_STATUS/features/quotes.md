# Admin Panel — Quotes Feature

**Last updated:** 2026-04-17  
**Status:** Built

---

## What It Is

A pre-invoice document workflow. A quote is sent to a client before work begins. Once accepted, it can be converted directly into an invoice with one click.

---

## Lifecycle

`draft` → `sent` → `accepted` → `converted`  
or  
`draft` → `sent` → `declined`

---

## Pages & Routes

| File | Type | Purpose |
|------|------|---------|
| `apps/admin/src/pages/quotes/index.astro` | SSR page | Main quotes management UI |
| `apps/admin/src/pages/api/quotes/quotes.ts` | API | GET / POST / PUT / DELETE |
| `apps/admin/src/pages/api/quotes/status.ts` | API | PUT — update status only |
| `apps/admin/src/pages/api/quotes/convert.ts` | API | POST — convert to invoice |
| `apps/admin/src/pages/api/quotes/pdf.ts` | API | GET — download PDF |
| `apps/admin/src/pages/api/quotes/send-email.ts` | API | POST — email quote PDF |
| `apps/admin/src/lib/quotes.ts` | Lib | All DB operations |
| `apps/admin/src/lib/quote-pdf.ts` | Lib | PDF generation (pdf-lib) |
| `apps/admin/migrations/010_quotes.sql` | Migration | `quotes` table + sequence |

---

## UI Features

- Stats bar: Total / Draft / Sent / Accepted / Declined / Converted counts
- Filter tabs by status
- Search by client name or quote number
- New Quote modal — client selector, line item editor (description, qty, unit price), tax rate, valid until, notes
- Edit modal — same as create, pre-populated
- Actions per row: View PDF, Send email, Mark Accepted, Mark Declined, Convert to Invoice, Delete
- Convert confirms: "This will create a new invoice…" → success toast with link to new invoice

---

## Quote Numbers

Auto-generated as `Q-{YYYY}-{NNN}` using PostgreSQL sequence `quote_number_seq`.
