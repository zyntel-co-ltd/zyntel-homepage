"""
Zyntel logo generator — Geist Sans (wordmarks), Geist Mono (code banner).

Place font files under ./fonts/ next to this script (recommended):
  - GeistSans-Medium.otf / GeistSans-Regular.otf (or Variable TTF)
  - GeistMono-Medium.otf / GeistMono-Regular.otf (or Variable TTF)

Download: https://github.com/vercel/geist-font
"""
from __future__ import annotations

import glob
import os
import re
from PIL import Image, ImageChops, ImageDraw, ImageFont

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
FONTS_DIR = os.path.join(SCRIPT_DIR, "fonts")

_sans_cache: dict[int, object] = {}
_sans_bold_cache: dict[int, object] = {}
_mono_cache: dict[int, object] = {}
_warned_sans = False
_warned_sans_bold = False
_warned_mono = False

# Short mark: overshoot height slightly so top/bottom ends exit through circle rim.
_BRACKET_HEIGHT_SCALE = 1.10
# Bracket anchor starts very close to left rim.
_BRACKET_INSET_FRAC = 0.01
# Negative = place bracket LEFT of center. Middle curve sits slightly right of left rim.
_BRACKET_PAST_CENTER_FRAC = -0.44
# Minimum rim inset — allow bracket to be very close to left edge.
_BRACKET_MIN_RIM_INSET_FRAC = 0.003
# Horizontal fine nudge after past-center step (fraction of R; negative = left, positive = right).
_BRACKET_LEFT_FINE_FRAC = 0.0


def _short_icon_circle_params(canvas: int) -> tuple[int, int, int]:
    """Center (cx, cy), radius R — circle inset by standard padding from square edge."""
    pad = max(2, int(canvas * 0.085))
    cx = cy = canvas // 2
    R = max(2, canvas // 2 - pad)
    return cx, cy, R


def _circle_mask_l(canvas: int, cx: int, cy: int, R: int) -> Image.Image:
    m = Image.new("L", (canvas, canvas), 0)
    d = ImageDraw.Draw(m)
    d.ellipse([cx - R, cy - R, cx + R, cy + R], fill=255)
    return m


def _short_bracket_anchor_xy(canvas: int, cx: int, cy: int, R: int, font) -> tuple[int, int]:
    """Left-middle anchor: horizontal position unchanged from inset + past-center + fine; vertical centered on disk."""
    tmp = Image.new("RGBA", (canvas, canvas), (0, 0, 0, 0))
    td = ImageDraw.Draw(tmp)
    inset = max(1, int(R * _BRACKET_INSET_FRAC))
    tx = cx - R + inset
    # Measure at disk vertical center so horizontal nudge does not depend on a manual Y shift.
    bb = td.textbbox((tx, cy), "}", font=font, anchor="lm")
    bcx = (bb[0] + bb[2]) / 2
    target_cx = cx + int(R * _BRACKET_PAST_CENTER_FRAC)
    tx = int(tx + max(0.0, target_cx - bcx))
    tx_min = cx - R + max(1, int(R * _BRACKET_MIN_RIM_INSET_FRAC))
    tx = max(tx_min, tx)
    tx += int(R * _BRACKET_LEFT_FINE_FRAC)
    # Center glyph bbox vertically on the disk (balanced top/bottom inside the circle clip).
    bb2 = td.textbbox((tx, cy), "}", font=font, anchor="lm")
    bcy = (bb2[1] + bb2[3]) / 2
    ty = int(round(2 * cy - bcy))
    return tx, ty


def render_short_appicon_raster(variant: dict, canvas: int, mode: str) -> Image.Image:
    """
    Facebook-style: square canvas, transparent outside a circle; bracket clipped to circle.
    mode 'appsquare': filled circle (disk) + colored } (left, full vertical span).
    mode 'transparent': no disk; } only, still clipped to the same circle.
    """
    img = Image.new("RGBA", (canvas, canvas), (0, 0, 0, 0))
    cx, cy, R = _short_icon_circle_params(canvas)
    mask = _circle_mask_l(canvas, cx, cy, R)
    hair = max(1, canvas // 1024)

    if mode == "appsquare":
        draw = ImageDraw.Draw(img)
        draw.ellipse([cx - R, cy - R, cx + R, cy + R], fill=hex_to_rgba(variant["circle_bg"]))

    target_h = int((2 * R - max(1, hair * 2)) * _BRACKET_HEIGHT_SCALE)
    _, font = fit_bracket_font_max_height(target_h, load_geist_sans_bold)
    col = hex_to_rgba(variant["bracket"])
    tx, ty = _short_bracket_anchor_xy(canvas, cx, cy, R, font)

    br = Image.new("RGBA", (canvas, canvas), (0, 0, 0, 0))
    bdraw = ImageDraw.Draw(br)
    bdraw.text((tx, ty), "}", fill=col, font=font, anchor="lm")
    r, g, b, a = br.split()
    br.putalpha(ImageChops.multiply(a, mask))
    img = Image.alpha_composite(img, br)
    return img


def hex_to_rgba(hex_color: str):
    hex_color = hex_color.lstrip("#")
    r = int(hex_color[0:2], 16)
    g = int(hex_color[2:4], 16)
    b = int(hex_color[4:6], 16)
    return (r, g, b, 255)


def hex_to_rgb(hex_color: str):
    hex_color = hex_color.lstrip("#")
    r = int(hex_color[0:2], 16)
    g = int(hex_color[2:4], 16)
    b = int(hex_color[4:6], 16)
    return (r, g, b)


def _try_load_font(paths: list[str], size: int):
    for path in paths:
        if path and os.path.isfile(path):
            try:
                return ImageFont.truetype(path, size)
            except OSError:
                continue
    return None


def _geist_sans_search_paths() -> list[str]:
    patterns = [
        os.path.join(FONTS_DIR, "GeistSans*.ttf"),
        os.path.join(FONTS_DIR, "GeistSans*.otf"),
        os.path.join(FONTS_DIR, "Geist*VF*.ttf"),
        os.path.join(FONTS_DIR, "Geist*Variable*.ttf"),
        "C:/Windows/Fonts/GeistSans*.ttf",
        "C:/Windows/Fonts/GeistSans*.otf",
        "/Library/Fonts/GeistSans*.otf",
        "/usr/share/fonts/truetype/geist/*.ttf",
    ]
    out: list[str] = []
    for p in patterns:
        if "*" in p:
            out.extend(sorted(glob.glob(p)))
        elif os.path.isfile(p):
            out.append(p)
    # Prefer Medium / SemiBold for logos
    preferred = [p for p in out if any(x in os.path.basename(p).lower() for x in ("medium", "semibold", "bold"))]
    rest = [p for p in out if p not in preferred]
    return preferred + rest


def _geist_mono_search_paths() -> list[str]:
    patterns = [
        os.path.join(FONTS_DIR, "GeistMono*.ttf"),
        os.path.join(FONTS_DIR, "GeistMono*.otf"),
        os.path.join(FONTS_DIR, "Geist*Mono*.ttf"),
        "C:/Windows/Fonts/GeistMono*.ttf",
        "C:/Windows/Fonts/GeistMono*.otf",
        "/Library/Fonts/GeistMono*.otf",
    ]
    out: list[str] = []
    for p in patterns:
        if "*" in p:
            out.extend(sorted(glob.glob(p)))
        elif os.path.isfile(p):
            out.append(p)
    preferred = [p for p in out if "medium" in os.path.basename(p).lower() or "regular" in os.path.basename(p).lower()]
    rest = [p for p in out if p not in preferred]
    return preferred + rest


def load_geist_sans(size: int):
    global _warned_sans
    if size in _sans_cache:
        return _sans_cache[size]
    font = _try_load_font(_geist_sans_search_paths(), size)
    if font:
        _sans_cache[size] = font
        return font
    for path in (
        "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/arial.ttf",
        "/Library/Fonts/SFNSText.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ):
        f = _try_load_font([path], size)
        if f:
            if not _warned_sans:
                print("  WARNING: Geist Sans not found; place Geist under ./fonts/ — using system sans fallback.")
                _warned_sans = True
            _sans_cache[size] = f
            return f
    _sans_cache[size] = ImageFont.load_default()
    return _sans_cache[size]


def _geist_sans_bold_paths() -> list[str]:
    patterns = [
        os.path.join(FONTS_DIR, "GeistSans*Bold*.otf"),
        os.path.join(FONTS_DIR, "GeistSans*Bold*.ttf"),
        os.path.join(FONTS_DIR, "GeistSans*SemiBold*.otf"),
        os.path.join(FONTS_DIR, "GeistSans*SemiBold*.ttf"),
        os.path.join(FONTS_DIR, "Geist*VF*.ttf"),
        "C:/Windows/Fonts/GeistSans*Bold*.ttf",
        "/Library/Fonts/GeistSans-Bold.otf",
    ]
    out: list[str] = []
    for p in patterns:
        if "*" in p:
            out.extend(sorted(glob.glob(p)))
        elif os.path.isfile(p):
            out.append(p)
    return list(dict.fromkeys(out))


def load_geist_sans_bold(size: int):
    """Prefer Geist Sans Bold/SemiBold for short-logo } (thicker stroke)."""
    global _warned_sans_bold
    if size in _sans_bold_cache:
        return _sans_bold_cache[size]
    bold_paths = list(dict.fromkeys(_geist_sans_bold_paths()))
    named = [
        p
        for p in _geist_sans_search_paths()
        if re.search(r"(bold|semibold|black)", os.path.basename(p), re.I)
    ]
    for paths in (bold_paths, named):
        font = _try_load_font(paths, size)
        if font:
            _sans_bold_cache[size] = font
            return font
    font = load_geist_sans(size)
    if font and not _warned_sans_bold:
        print("  NOTE: Geist Sans Bold not found under ./fonts/ — using Medium for short-logo bracket.")
        _warned_sans_bold = True
    _sans_bold_cache[size] = font
    return font


def fit_bracket_font_max_height(max_h: int, font_loader) -> tuple[int, object]:
    """Largest font so '}' vertical bbox fits within max_h (width may exceed)."""
    cap = max(8, max_h)
    best = max(8, cap // 3)
    top = min(cap * 2, 1400)
    for fs in range(top, 7, -1):
        f = font_loader(fs)
        try:
            bbox = f.getbbox("}")
        except Exception:
            bbox = (0, 0, fs, fs)
        h = bbox[3] - bbox[1]
        if h <= cap:
            best = fs
            break
    return best, font_loader(best)


def load_geist_mono(size: int):
    global _warned_mono
    if size in _mono_cache:
        return _mono_cache[size]
    font = _try_load_font(_geist_mono_search_paths(), size)
    if font:
        _mono_cache[size] = font
        return font
    for path in (
        "C:/Windows/Fonts/consola.ttf",
        "C:/Windows/Fonts/consolab.ttf",
        "/Library/Fonts/Consolas.ttf",
    ):
        f = _try_load_font([path], size)
        if f:
            if not _warned_mono:
                print("  WARNING: Geist Mono not found; place Geist Mono under ./fonts/ — using Consolas fallback.")
                _warned_mono = True
            _mono_cache[size] = f
            return f
    _mono_cache[size] = ImageFont.load_default()
    return _mono_cache[size]


# --- Short logos: circular disk (Facebook-style) + flat “}” clipped to circle ---
SHORT_VARIANTS: list[dict] = [
    {
        "id": "cyan_on_black",
        "label": "Cyan } on black circle",
        "bracket": "#00f0ff",
        "circle_bg": "#0a0a0a",
    },
    {
        "id": "black_on_silver",
        "label": "Black } on gray circle",
        "bracket": "#0a0a0a",
        "circle_bg": "#c0c0c0",
    },
    {
        "id": "green_on_black",
        "label": "Green } on black circle",
        "bracket": "#7de19a",
        "circle_bg": "#0a0a0a",
    },
    {
        "id": "gold_on_black",
        "label": "Gold } on black circle",
        "bracket": "#ffe066",
        "circle_bg": "#0a0a0a",
    },
]

_BLACK_DISK_HEX = "0a0a0a"


def short_variants_for_export() -> list[dict]:
    """Base short variants plus white-disk alternates for black disks (dark UIs / theme switching)."""
    out: list[dict] = [dict(v) for v in SHORT_VARIANTS]
    seen = {v["id"] for v in out}
    for spec in SHORT_VARIANTS:
        bg = spec["circle_bg"].lstrip("#").lower()
        if bg != _BLACK_DISK_HEX:
            continue
        wid = f'{spec["id"]}_white_disk'
        if wid in seen:
            continue
        out.append(
            {
                **spec,
                "id": wid,
                "label": f'{spec.get("label", "")} — white disk (dark UI)',
                "circle_bg": "#ffffff",
            }
        )
        seen.add(wid)
    return out


# Short PNG exports: app pipelines + common web / design breakpoints.
SHORT_LOGO_PNG_SIZES = [2048, 1536, 1024, 768, 512, 384, 256, 192, 128, 96, 64, 48, 32]
# Glyph-only (no disk) — fewer sizes; avoids huge “full brace” assets at 2048 and tiny 32×32.
SHORT_LOGO_TRANSPARENT_SIZES = [1024, 768, 512, 256, 128, 64]


def cleanup_legacy_short_pngs():
    """Remove stray short_appicon PNGs (e.g. *_1024.png, *_128x128.png) that omit _appsquare/_transparent."""
    d = os.path.join(SCRIPT_DIR, "logos")
    if not os.path.isdir(d):
        return
    for name in os.listdir(d):
        if not name.startswith("short_appicon_") or not name.endswith(".png"):
            continue
        if re.search(r"_\d+_(appsquare|transparent)\.png$", name):
            continue
        if re.search(r"_\d+x\d+_appsquare\.png$", name):
            continue
        p = os.path.join(d, name)
        try:
            os.remove(p)
            print(f"Removed legacy {p}")
        except OSError as e:
            print(f"  (could not remove {p}: {e})")


def cleanup_transparent_short_pngs_not_in_allowed(allowed: set[int]):
    """Remove short_appicon_*_*_transparent.png whose size is no longer exported."""
    d = os.path.join(SCRIPT_DIR, "logos")
    if not os.path.isdir(d):
        return
    pat = re.compile(r"^short_appicon_.+_(\d+)_transparent\.png$")
    for name in os.listdir(d):
        m = pat.match(name)
        if not m:
            continue
        if int(m.group(1)) in allowed:
            continue
        p = os.path.join(d, name)
        try:
            os.remove(p)
            print(f"Removed obsolete transparent {p}")
        except OSError as e:
            print(f"  (could not remove {p}: {e})")


def create_short_appicon_pngs():
    """Filled disk: all SHORT_LOGO_PNG_SIZES. Glyph-only transparent: SHORT_LOGO_TRANSPARENT_SIZES only + ICO ladder."""
    os.makedirs(os.path.join(SCRIPT_DIR, "logos"), exist_ok=True)
    cleanup_legacy_short_pngs()
    allowed_t = set(SHORT_LOGO_TRANSPARENT_SIZES)
    cleanup_transparent_short_pngs_not_in_allowed(allowed_t)

    for spec in short_variants_for_export():
        sid = spec["id"]
        for canvas in SHORT_LOGO_PNG_SIZES:
            img = render_short_appicon_raster(spec, canvas, "appsquare")
            out = os.path.join(SCRIPT_DIR, "logos", f"short_appicon_{sid}_{canvas}_appsquare.png")
            img.save(out, "PNG")
            print(f"Created {out}")
        for canvas in SHORT_LOGO_TRANSPARENT_SIZES:
            img = render_short_appicon_raster(spec, canvas, "transparent")
            out = os.path.join(SCRIPT_DIR, "logos", f"short_appicon_{sid}_{canvas}_transparent.png")
            img.save(out, "PNG")
            print(f"Created {out}")
        _save_ico_from_variant(spec)



def _save_ico_from_variant(spec: dict):
    """ICO + per-size PNG ladder — filled-circle variant only."""
    os.makedirs(os.path.join(SCRIPT_DIR, "logos"), exist_ok=True)
    sid = spec["id"]
    icon_sizes = [16, 24, 32, 48, 64, 128, 256]
    images: list[Image.Image] = []

    for size in icon_sizes:
        img = render_short_appicon_raster(spec, size, "appsquare")
        images.append(img)
        p = os.path.join(SCRIPT_DIR, "logos", f"short_appicon_{sid}_{size}x{size}_appsquare.png")
        img.save(p, "PNG")

    if images:
        images[0].save(
            os.path.join(SCRIPT_DIR, "logos", f"short_appicon_{sid}.ico"),
            format="ICO",
            sizes=[(s, s) for s in icon_sizes],
            append_images=images[1:],
        )
        print(f"Created logos/short_appicon_{sid}.ico")


# --- Full logos: circular short mark + wordmark, transparent background ---
FULL_LOGOS: list[dict] = [
    {
        "id": "zyntel",
        "wordmark": "zyntel",
        "color": "#00f0ff",
        "subtitle": None,
        "short_id": "cyan_on_black",
    },
    {
        "id": "zyntforms_company",
        "wordmark": "zyntForms",
        "color": "#0a0a0a",
        "subtitle": None,
        "short_id": "black_on_silver",
    },
    {
        "id": "kanta",
        "wordmark": "Kanta",
        "color": "#7de19a",
        "subtitle": "Operational.Intelligence",
        "short_id": "green_on_black",
    },
    {
        "id": "mazra",
        "wordmark": "mazra",
        "color": "#ffe066",
        "subtitle": None,
        "short_id": "gold_on_black",
    },
]

FULL_LOGO_WIDTH = 1000
FULL_LOGO_HEIGHT = 420
# Extra full-wordmark widths (height scales with 1000:420). Canonical 1000w → full_<id>_transparent.png
FULL_LOGO_EXPORT_WIDTHS = [2400, 2000, 1600, 1200, 1000, 800, 600, 400]


def _short_variant(short_id: str) -> dict:
    for v in short_variants_for_export():
        if v["id"] == short_id:
            return v
    raise KeyError(short_id)


def _render_full_logo_raster(spec: dict, width: int, height: int) -> Image.Image:
    """Circular short mark + wordmark; horizontal margins + auto-fit so nothing clips (e.g. Kanta tagline)."""
    scale = width / 1000.0
    img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    color_rgba = hex_to_rgba(spec["color"])
    if len(color_rgba) == 3:
        color_rgba = color_rgba + (255,)

    margin_x = max(16, int(width * 0.05))
    usable_w = max(120, width - 2 * margin_x)

    word_size = max(24, int(132 * scale))
    sub_size = max(18, int(72 * scale)) if spec["subtitle"] else 0
    # Tight horizontal spacing so disk + wordmark read as one lockup (not two separate blocks).
    gap = max(6, int(14 * scale))
    gap_lines = max(6, int(10 * scale))

    word = spec["wordmark"]
    sub = spec["subtitle"]
    short_spec = _short_variant(spec["short_id"])

    mark_px = max(96, min(int(340 * scale), int(height * 0.88)))
    mark_px = min(mark_px, width // 2, int(usable_w * 0.42))

    total_w = float("inf")
    for _ in range(120):
        font_word = load_geist_sans(word_size)
        font_sub = load_geist_sans(sub_size) if spec["subtitle"] else None
        mark_img = render_short_appicon_raster(short_spec, mark_px, "appsquare")
        mw, mh = mark_img.size

        ww = draw.textlength(word, font=font_word)
        if sub and font_sub:
            sw = draw.textlength(sub, font=font_sub)
            text_block_w = max(ww, sw)
        else:
            text_block_w = ww

        total_w = mw + gap + text_block_w
        if total_w <= usable_w:
            break
        if spec["subtitle"] and sub_size > 11:
            sub_size -= 2
        elif mark_px > 64:
            mark_px = max(64, int(mark_px * 0.96))
        else:
            word_size = max(18, word_size - 2)

    font_word = load_geist_sans(word_size)
    font_sub = load_geist_sans(sub_size) if spec["subtitle"] else None
    mark_img = render_short_appicon_raster(short_spec, mark_px, "appsquare")
    mw, mh = mark_img.size
    ww = draw.textlength(word, font=font_word)
    if sub and font_sub:
        sw = draw.textlength(sub, font=font_sub)
        text_block_w = max(ww, sw)
    else:
        text_block_w = ww
    total_w = mw + gap + text_block_w

    start_x = margin_x + (usable_w - total_w) / 2
    start_x = max(margin_x, min(start_x, width - margin_x - total_w))
    cy = height / 2

    mx0 = int(start_x)
    my0 = int(cy - mh / 2)
    img.paste(mark_img, (mx0, my0), mark_img)

    text_left = start_x + mw + gap
    mid_x = text_left + text_block_w / 2
    if sub and font_sub:
        m_w = draw.textbbox((0, 0), word, font=font_word)
        m_s = draw.textbbox((0, 0), sub, font=font_sub)
        h_word = m_w[3] - m_w[1]
        h_sub = m_s[3] - m_s[1]
        block_h = h_word + gap_lines + h_sub
        y_top = cy - block_h / 2
        wb = draw.textbbox((text_left, y_top), word, font=font_word, anchor="lt")
        cxw = (wb[0] + wb[2]) / 2
        cyw = (wb[1] + wb[3]) / 2
        draw.text((cxw, cyw), word, fill=color_rgba, font=font_word, anchor="mm")
        draw.text((text_left, wb[3] + gap_lines), sub, fill=color_rgba, font=font_sub, anchor="lt")
    else:
        draw.text((mid_x, cy), word, fill=color_rgba, font=font_word, anchor="mm")

    return img


def create_full_logos_transparent():
    """Circular short mark + wordmark — canonical 1000×420 plus scaled widths (Geist Sans)."""
    os.makedirs(os.path.join(SCRIPT_DIR, "logos"), exist_ok=True)
    stale = os.path.join(SCRIPT_DIR, "logos", "full_zyntforms_forms_transparent.png")
    if os.path.isfile(stale):
        try:
            os.remove(stale)
            print(f"Removed stale {stale}")
        except OSError:
            pass

    for spec in FULL_LOGOS:
        for w in FULL_LOGO_EXPORT_WIDTHS:
            h = max(120, int(w * 420 / 1000))
            img = _render_full_logo_raster(spec, w, h)
            if w == FULL_LOGO_WIDTH:
                out = os.path.join(SCRIPT_DIR, "logos", f"full_{spec['id']}_transparent.png")
            else:
                out = os.path.join(SCRIPT_DIR, "logos", f"full_{spec['id']}_{w}w_transparent.png")
            img.save(out, "PNG")
            print(f"Created {out}")

    # Full wordmarks using white-disk short marks (for dark-mode UI where black disks disappear)
    for spec in FULL_LOGOS:
        sid = spec["short_id"]
        base = _short_variant(sid)
        if base["circle_bg"].lstrip("#").lower() != _BLACK_DISK_HEX:
            continue
        alt_id = f"{sid}_white_disk"
        try:
            _short_variant(alt_id)
        except KeyError:
            continue
        spec_wd = {**spec, "short_id": alt_id}
        for w in FULL_LOGO_EXPORT_WIDTHS:
            h = max(120, int(w * 420 / 1000))
            img = _render_full_logo_raster(spec_wd, w, h)
            if w == FULL_LOGO_WIDTH:
                out = os.path.join(SCRIPT_DIR, "logos", f"full_{spec['id']}_white_disk_transparent.png")
            else:
                out = os.path.join(
                    SCRIPT_DIR, "logos", f"full_{spec['id']}_{w}w_white_disk_transparent.png"
                )
            img.save(out, "PNG")
            print(f"Created {out}")


def create_code_logo():
    """Code-style banner — Geist Mono (replaces Consolas)."""
    os.makedirs(os.path.join(SCRIPT_DIR, "logos"), exist_ok=True)

    colors = {
        "zyntel": "#00f0ff",
        "brackets": "#c0c0c0",
        "measured": "#ffe066",
        "managed": "#7de19a",
    }

    backgrounds = {
        "transparent": (0, 0, 0, 0),
        "white": (255, 255, 255, 255),
        "dark": (10, 10, 10, 255),
    }

    resolutions = {
        "large": (2000, 600),
        "medium": (1000, 300),
        "small": (500, 150),
    }

    for bg_name, bg_color in backgrounds.items():
        for size_name, (w, h) in resolutions.items():
            if size_name == "large":
                font_size = 100
            elif size_name == "medium":
                font_size = 50
            else:
                font_size = 25

            img = Image.new("RGBA", (w, h), bg_color)
            draw = ImageDraw.Draw(img)
            current_font = load_geist_mono(font_size)

            line_parts = [
                ["zyntel", "()", " => ", "{"],
                ['    "', "measured", ".", "managed", '";'],
                ["}"],
            ]

            line_colors = [
                [colors["zyntel"], colors["brackets"], colors["brackets"], colors["brackets"]],
                [colors["brackets"], colors["measured"], colors["brackets"], colors["managed"], colors["brackets"]],
                [colors["brackets"]],
            ]

            line_height = font_size * 1.02
            max_line_width = 0
            for parts in line_parts:
                lw = sum(draw.textlength(part, font=current_font) for part in parts)
                max_line_width = max(max_line_width, lw)

            start_x = (w - max_line_width) / 2
            start_y = (h - (line_height * len(line_parts))) / 2
            current_y = start_y

            for parts, colors_list in zip(line_parts, line_colors):
                current_x = start_x
                for part, col in zip(parts, colors_list):
                    draw.text((current_x, current_y), part, fill=hex_to_rgba(col), font=current_font)
                    current_x += draw.textlength(part, font=current_font)
                current_y += line_height

            fn = os.path.join(SCRIPT_DIR, "logos", f"zyntel_code_{size_name}_{bg_name}_bg.png")
            img.save(fn, "PNG")
            print(f"Created code logo: {fn}")


def create_short_appicon_svgs():
    """SVG: transparent square, circle clip, left } — matches PNG (bold weight, overshoot)."""
    os.makedirs(os.path.join(SCRIPT_DIR, "logos"), exist_ok=True)
    size = 1024
    font_url_bold = "../fonts/GeistSans-Bold.otf"
    font_url_fallback = "../fonts/GeistSans-Medium.otf"
    cx = cy = size // 2
    pad = max(2, int(size * 0.085))
    R = max(2, size // 2 - pad)
    hair = max(1, size // 1024)
    target_h = int((2 * R - max(1, hair * 2)) * _BRACKET_HEIGHT_SCALE)
    fs, font = fit_bracket_font_max_height(target_h, load_geist_sans_bold)
    tx, ty = _short_bracket_anchor_xy(size, cx, cy, R, font)

    for spec in short_variants_for_export():
        sid = spec["id"]
        bracket_hex = spec["bracket"]
        disk = spec["circle_bg"]

        for mode in ("appsquare", "transparent"):
            path = os.path.join(SCRIPT_DIR, "logos", f"short_appicon_{sid}_{mode}.svg")
            clip_id = f"shortCircleClip_{sid}_{mode}"
            disk_el = (
                f'  <circle cx="{cx}" cy="{cy}" r="{R}" fill="{disk}"/>\n' if mode == "appsquare" else ""
            )
            body = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" width="{size}" height="{size}">
  <defs>
    <clipPath id="{clip_id}">
      <circle cx="{cx}" cy="{cy}" r="{R}"/>
    </clipPath>
    <style type="text/css"><![CDATA[
      @font-face {{
        font-family: 'Geist Sans';
        src: url('{font_url_bold}') format('opentype'), url('{font_url_fallback}') format('opentype');
        font-weight: 700;
        font-style: normal;
      }}
      .mark {{ font-family: 'Geist Sans', 'Segoe UI', system-ui, sans-serif; font-weight: 700; }}
    ]]></style>
  </defs>
{disk_el}  <g clip-path="url(#{clip_id})">
    <text class="mark" x="{tx}" y="{ty}" text-anchor="start" dominant-baseline="central"
          fill="{bracket_hex}" font-size="{fs}">}}</text>
  </g>
</svg>
"""
            with open(path, "w", encoding="utf-8") as f:
                f.write(body)
            print(f"Created {path}")


def create_readme_file():
    sz = ", ".join(str(s) for s in SHORT_LOGO_PNG_SIZES)
    szt = ", ".join(str(s) for s in SHORT_LOGO_TRANSPARENT_SIZES)
    fw = ", ".join(str(w) for w in FULL_LOGO_EXPORT_WIDTHS if w != FULL_LOGO_WIDTH)
    readme_content = """# Zyntel logo assets (generated)

## Fonts
- **Geist Sans** — wordmarks and bracket marks in full/short logos.
- **Geist Mono** — `zyntel_code_*` banner (JavaScript-style).

Install fonts under `fonts/` next to `zyntel_logos.py`, or system-wide:
https://github.com/vercel/geist-font

## Short app icons (circular disk + bold brace)
- Square PNG, **transparent outside the circle**; disk + **bold** `}` (Geist Sans Bold), **overscaled** then **clipped** to the circle; bracket is **vertically centered** on the disk; horizontal placement follows inset + past-center + fine-tune constants.
- **Filled (disk + bracket):** sizes """ + sz + """ px → `short_appicon_<id>_<size>_appsquare.png`.
- **Glyph-only** (no disk, same circular clip): sizes """ + szt + """ px only → `short_appicon_<id>_<size>_transparent.png` (avoids huge “bare brace” 2048px files and noisy 32px transparents).
- **ICO / ladder:** `short_appicon_<id>.ico`, `short_appicon_<id>_<n>x<n>_appsquare.png`

| id | Bracket | Circle fill |
|----|---------|-------------|
| cyan_on_black | #00f0ff | #0a0a0a |
| black_on_silver | #0a0a0a | #c0c0c0 |
| green_on_black | #7de19a | #0a0a0a |
| gold_on_black | #ffe066 | #0a0a0a |

For each **black-disk** row above, a matching **`{id}_white_disk`** variant is also exported (same bracket colour, **#ffffff** disk) for dark-themed pages.

SVG: `short_appicon_<id>_appsquare.svg`, `short_appicon_<id>_transparent.svg`

## Full wordmarks (transparent)
- Same **circular short mark** as app icons + wordmark. Canonical: `full_<id>_transparent.png` (1000×420).
- When the short mark uses a **black disk**, a parallel set uses the **white-disk** short mark: `full_<id>_white_disk_transparent.png` and `full_<id>_<width>w_white_disk_transparent.png`.
- Additional: `full_<id>_<width>w_transparent.png` for """ + fw + """ px (height scales with 1000:420).
- Layout uses **~5% side margins** and **auto-shrinks** long subtitles (then mark / word) so the row fits — no clipped disk or tagline.

## Code banner
`zyntel_code_<large|medium|small>_<transparent|white|dark>_bg.png`
"""
    out = os.path.join(SCRIPT_DIR, "logos", "LOGO_README.md")
    with open(out, "w", encoding="utf-8") as f:
        f.write(readme_content)
    print(f"Created {out}")


if __name__ == "__main__":
    os.chdir(SCRIPT_DIR)
    print("Creating Zyntel logo set (Geist Sans / Geist Mono)...\n")

    print("1) Code banner (Geist Mono)...")
    create_code_logo()

    print("\n2) Short app icon PNGs (all sizes, all variants)...")
    create_short_appicon_pngs()

    print("\n2b) Short app icon SVGs...")
    create_short_appicon_svgs()

    print("\n3) Full logos — transparent...")
    create_full_logos_transparent()

    print("\n4) README...")
    create_readme_file()

    print("\nDone. Output: logos/")