#!/usr/bin/env node
/**
 * Map `logos/` output from `zyntel_logos.py` into public paths used by web + admin.
 * Run from repo root after: python zyntel_logos.py
 */
import { copyFileSync, mkdirSync, existsSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const logos = join(root, 'logos');
const webLogos = join(root, 'apps', 'web', 'public', 'logos');
const adminLogos = join(root, 'apps', 'admin', 'public', 'logos');
const adminImagesLogos = join(root, 'apps', 'admin', 'public', 'images', 'logos');

function ensureDir(p) {
  mkdirSync(p, { recursive: true });
}

async function main() {
  const fullZyntel = join(logos, 'full_zyntel_transparent.png');
  const shortCyan = join(logos, 'short_appicon_cyan_on_black_256_appsquare.png');
  const fullKanta = join(logos, 'full_kanta_transparent.png');

  ensureDir(webLogos);
  ensureDir(adminLogos);
  ensureDir(adminImagesLogos);

  if (!existsSync(fullZyntel)) {
    throw new Error(`Missing ${fullZyntel} — run: python zyntel_logos.py`);
  }

  copyFileSync(fullZyntel, join(webLogos, 'zyntel_full_cyan.png'));

  const whiteBuf = await sharp(fullZyntel)
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png()
    .toBuffer();
  writeFileSync(join(webLogos, 'zyntel_full_cyan_white_bg.png'), whiteBuf);

  if (existsSync(shortCyan)) {
    copyFileSync(shortCyan, join(webLogos, 'zyntel_logo_cyan.png'));
    copyFileSync(shortCyan, join(adminLogos, 'zyntel_logo_cyan.png'));
    copyFileSync(shortCyan, join(adminImagesLogos, 'zyntel_logo_cyan.png'));
  } else {
    console.warn('Missing short cyan app icon — admin square logo not updated:', shortCyan);
  }

  if (existsSync(fullKanta)) {
    copyFileSync(fullKanta, join(webLogos, 'kanta-full.png'));
  }

  copyFileSync(fullZyntel, join(adminImagesLogos, 'zyntel_full_cyan.png'));
  copyFileSync(fullZyntel, join(adminLogos, 'zyntel_full_cyan.png'));

  console.log('Synced generator logos → apps/web/public/logos, apps/admin/public/logos, apps/admin/public/images/logos');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
