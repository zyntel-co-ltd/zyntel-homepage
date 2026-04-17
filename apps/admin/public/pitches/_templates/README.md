# Pitch deck templates

Pitch decks are served as **static HTML assets** from `apps/admin/public/pitches/`.
They are accessed through the **public token gate** at:

- `admin.zyntel.net/p/pitch/{token}`

The token gate looks up the token in Neon (`pitch_sessions`) and redirects the user to:

- `/pitches/{deck_folder}/{deck_file}?token={token}`

---

## Folder naming convention

Use `{product}-{round}`.

Examples:
- `kanta-seed`
- `kanta-preseed`
- `kanta-hackathon-2026`

---

## File naming convention

Always use:

- `pitch-deck.html`

This is the entry point for consistency — the pitch token route defaults to this filename.

---

## How to add a new pitch deck

1. Create a new folder at `apps/admin/public/pitches/{product-round}/`
2. Add a single file: `pitch-deck.html`
3. Ensure the HTML is a **single self-contained file** (no external JS/CSS files alongside it)
4. Push to `main` (Vercel serves it automatically)
5. In the admin panel, create a new Pitch Session and select:
   - `deck_folder` = your folder name (e.g. `kanta-seed`)
   - `deck_file` = `pitch-deck.html`

---

## Important: pitches vs client design previews

Client design previews (`/clients/`) use `preview-nav.js` to propagate tokens across many HTML pages.

Pitch decks (`/pitches/`) are **single-file presentations** with their own internal navigation, so
`preview-nav.js` is **not used** here.

