# Zyntel logo assets (generated)

## Fonts
- **Geist Sans** — wordmarks and bracket marks in full/short logos.
- **Geist Mono** — `zyntel_code_*` banner (JavaScript-style).

Install fonts under `fonts/` next to `zyntel_logos.py`, or system-wide:
https://github.com/vercel/geist-font

## Short app icons (circular disk + bold brace)
- Square PNG, **transparent outside the circle**; disk + **bold** `}` (Geist Sans Bold), **overscaled** then **clipped** to the circle; bracket is **vertically centered** on the disk; horizontal placement follows inset + past-center + fine-tune constants.
- **Large `*_appsquare.png` (e.g. 2048 px)** are *not* “uncropped” mistakes: the mark lives in a **circle**; the rest of the square is **transparent** for adaptive-icon / store safe zones. For **full-bleed square** icons use the Kanta PWA renders (`kanta_pwa_icon_*.png`, `kanta_apple_touch_icon_*.png`) or `render_kanta_black_rounded_square_icon`.
- **Filled (disk + bracket):** sizes 2048, 1536, 1024, 768, 512, 384, 256, 192, 128, 96, 64, 48, 32 px → `short_appicon_<id>_<size>_appsquare.png`.
- **Glyph-only** (no disk, same circular clip): sizes 1024, 768, 512, 256, 128, 64 px only → `short_appicon_<id>_<size>_transparent.png` (avoids huge “bare brace” 2048px files and noisy 32px transparents).
- **ICO / ladder:** `short_appicon_<id>.ico`, `short_appicon_<id>_<n>x<n>_appsquare.png`

| id | Bracket | Circle fill |
|----|---------|-------------|
| cyan_on_black | #00f0ff | #0a0a0a |
| black_on_silver | #0a0a0a | #c0c0c0 |
| green_on_black | #7de19a | #0a0a0a |
| gold_on_black | #ffe066 | #0a0a0a |

For each **black-disk** row above, a matching **`{id}_white_disk`** variant is also exported (same bracket colour, **#ffffff** disk) for dark-themed pages.

SVG: `short_appicon_<id>_appsquare.svg`, `short_appicon_<id>_transparent.svg`

## Kanta PWA / Apple / Android (mirrored under `logos/`)
- **Default (Kanta green):** `kanta_pwa_icon_192.png`, `kanta_pwa_icon_512.png` — same as `../kanta/public/icons/icon-*.png` (rounded square, green bracket on black disk).
- **Default Apple touch:** `kanta_apple_touch_icon_180.png`, `kanta_apple_touch_icon_dark_180.png` — same as `apple-icon.png` / `apple-icon-dark.png` in `../kanta/public/`.
- **White-disk square (green bracket):** `kanta_apple_touch_icon_dark_white_disk_white_square_180.png`.
- **Per short-mark colour (all `short_variants_for_export` ids):** `kanta_pwa_icon_192_<id>.png`, `kanta_pwa_icon_512_<id>.png`, `kanta_apple_touch_icon_180_<id>.png`, `kanta_apple_touch_icon_dark_180_<id>.png`. White-disk variants also get `kanta_apple_touch_icon_dark_white_disk_white_square_180_<id>.png`.

## Kanta form marks (UI / “Cursor hole” style)
- **Hole (dark UI):** gray disk `#c0c4cc` with the bracket **knocked out** (transparent) — `kanta_short_gray_disk_bracket_hole_<size>.png` in `logos/`, and `kanta-short-form-hole_<size>.png` / `kanta-short-form-hole.png` under `../kanta/public/brand/`.
- **Light:** black disk + filled slate bracket — `kanta_short_black_disk_gray_bracket_<size>.png` in `logos/`, and `kanta-short-form-light_<size>.png` / `kanta-short-form-light.png` in `../kanta/public/brand/`.

## Full wordmarks (transparent)
- Same **circular short mark** as app icons + wordmark. Canonical: `full_<id>_transparent.png` (1000×420).
- When the short mark uses a **black disk**, a parallel set uses the **white-disk** short mark: `full_<id>_white_disk_transparent.png` and `full_<id>_<width>w_white_disk_transparent.png`.
- Additional: `full_<id>_<width>w_transparent.png` for 2400, 2000, 1600, 1200, 800, 600, 400 px (height scales with 1000:420).
- Layout uses **~5% side margins** and **auto-shrinks** long subtitles (then mark / word) so the row fits — no clipped disk or tagline.

## Code banner
`zyntel_code_<large|medium|small>_<transparent|white|dark>_bg.png`
