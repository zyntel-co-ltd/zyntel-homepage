#!/usr/bin/env node
/**
 * Favicon PNG/ICO set for zyntel-dashboard Vite app from its favicon.svg.
 * Run from zyntel-homepage repo root: node scripts/emit-dashboard-icons.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import sharp from 'sharp';

const require = createRequire(import.meta.url);
const svgToIco = require('svg-to-ico');

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const imgDir = join(root, '..', 'zyntel-dashboard', 'frontend', 'public', 'images');
const svgPath = join(imgDir, 'favicon.svg');

async function main() {
  await svgToIco({
    input_name: svgPath,
    output_name: join(imgDir, 'favicon.ico'),
    sizes: [16, 24, 32, 48],
  });
  const svg = readFileSync(svgPath);
  for (const [size, name] of [
    [16, 'favicon-16x16.png'],
    [32, 'favicon-32x32.png'],
    [48, 'favicon-48x48.png'],
    [192, 'favicon-192x192.png'],
  ]) {
    const buf = await sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
    writeFileSync(join(imgDir, name), buf);
  }
  console.log('Wrote zyntel-dashboard/frontend/public/images favicon.ico + PNG sizes');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
