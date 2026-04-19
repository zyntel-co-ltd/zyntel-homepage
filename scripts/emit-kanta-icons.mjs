#!/usr/bin/env node
/**
 * Generate favicon.ico, apple-touch, and PWA icons for kanta from public SVGs.
 * Light: favicon.svg (green on black disk). Dark: favicon-dark.svg (green on white disk).
 * Run from zyntel-homepage repo root: node scripts/emit-kanta-icons.mjs
 */
import { readFileSync, writeFileSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import sharp from 'sharp';

const require = createRequire(import.meta.url);
const svgToIco = require('svg-to-ico');

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const kantaPublic = join(root, '..', 'kanta', 'public');
const kantaApp = join(root, '..', 'kanta', 'app');
const svgLight = join(kantaPublic, 'favicon.svg');
const svgDark = join(kantaPublic, 'favicon-dark.svg');

async function main() {
  await svgToIco({
    input_name: svgLight,
    output_name: join(kantaPublic, 'favicon.ico'),
    sizes: [16, 24, 32, 48],
  });

  const light = readFileSync(svgLight);
  const dark = readFileSync(svgDark);

  const appleLight = await sharp(Buffer.from(light)).resize(180, 180).png().toBuffer();
  writeFileSync(join(kantaPublic, 'apple-icon.png'), appleLight);

  const appleDark = await sharp(Buffer.from(dark)).resize(180, 180).png().toBuffer();
  writeFileSync(join(kantaPublic, 'apple-icon-dark.png'), appleDark);

  const pwa192 = await sharp(Buffer.from(dark)).resize(192, 192).png().toBuffer();
  writeFileSync(join(kantaPublic, 'icons', 'icon-192.png'), pwa192);

  const pwa512 = await sharp(Buffer.from(dark)).resize(512, 512).png().toBuffer();
  writeFileSync(join(kantaPublic, 'icons', 'icon-512.png'), pwa512);

  await svgToIco({
    input_name: svgDark,
    output_name: join(kantaPublic, 'favicon-dark.ico'),
    sizes: [16, 24, 32, 48],
  });

  // Next.js App Router: favicon in /app is what browsers & Vercel use for the tab icon
  copyFileSync(join(kantaPublic, 'favicon.ico'), join(kantaApp, 'favicon.ico'));

  console.log(
    'Wrote kanta: favicon.ico, favicon-dark.ico, apple-icon(s), icons/icon-192/512, app/favicon.ico'
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
