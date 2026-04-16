# Template: Website Designs (3 Options)

Copy this entire folder to `apps/admin/public/clients/{client-slug}/` and replace
all `{{PLACEHOLDER}}` values before pushing.

## Placeholder reference

| Placeholder | Example |
|---|---|
| `{{CLIENT_NAME}}` | Kampala Fresh Foods Ltd |
| `{{CLIENT_TAGLINE}}` | Fresh produce, delivered daily |
| `{{CLIENT_INDUSTRY}}` | Food & Beverage |
| `{{CLIENT_LOCATION}}` | Kampala, Uganda |
| `{{CLIENT_PHONE}}` | +256 700 000 000 |
| `{{CLIENT_EMAIL}}` | info@example.com |
| `{{MONTH_YEAR}}` | May 2026 |
| `{{ZYNTEL_CONTACT_EMAIL}}` | hello@zyntel.net |

## Files

- `presentation.html` — comparison overview (entry point — use this as `presentationFile` in admin panel)
- `option-a.html` — Warm & Professional (red/cream palette)
- `option-b.html` — Fresh & Direct (green/cream palette)
- `option-c.html` — Light & Airy (blue/white palette)

## After copying to a client folder

- Option hrefs in `presentation.html` already point to `option-a.html` etc — correct as-is
- Back button hrefs in each option file already point to `presentation.html` — correct as-is
- `preview-nav.js` script is already included in all files — do not remove it
- In admin panel: set `clientFolder` = the folder name, `presentationFile` = `presentation.html`
