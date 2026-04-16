# Template: Web App Previews

For previewing web application screen designs to clients.

## Current state
`presentation.html` is a minimal scaffold showing screen placeholders.
Expand it per-client by replacing placeholders and adding actual screenshots or wireframes.

## Planned additions (build when first web-app client arrives)
- Live sandbox iframe embeds per screen
- Feature comparison table
- Pricing tier selector integrated into overview

## How to use
1. Copy this folder to `apps/admin/public/clients/{client-slug}/`
2. Replace all `{{PLACEHOLDER}}` values
3. Add screenshots or wireframe images to the client folder
4. Update `src` attributes on `<img>` tags (or replace `.screen-placeholder` divs with actual images)
5. In admin panel: set `presentationFile` = `presentation.html`
