# Design Preview Templates

Copy the appropriate subfolder into `apps/admin/public/clients/{client-slug}/`
and replace all `{{PLACEHOLDER}}` values before pushing.

| Template | Use for |
|---|---|
| `website-designs/` | Static website design options (3 variants) |
| `web-apps/` | Web application screen previews |
| `marketplace/` | Multi-vendor / listing platform previews |

## Onboarding a new design client
1. Admin panel `/previews` → New Client → fill details + brief
2. Copy `_templates/website-designs/` → `public/clients/{clientId}/`
3. Replace all `{{PLACEHOLDER}}` values in all four files
4. Push to `zyntel-homepage` → Vercel deploys automatically
5. Admin panel: confirm clientFolder and presentationFile match, then Send Email
