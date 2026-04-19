#!/usr/bin/env node
/**
 * Generate favicon.ico and apple-touch-icon for kanta from public/favicon.svg.
 * Run from zyntel-homepage repo root: node scripts/emit-kanta-icons.mjs
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
const kantaPublic = join(root, '..', 'kanta', 'public');
const svgPath = join(kantaPublic, 'favicon.svg');

async function main() {
  await svgToIco({
    input_name: svgPath,
    output_name: join(kantaPublic, 'favicon.ico'),
    sizes: [16, 24, 32, 48],
  });
  const svg = readFileSync(svgPath);
  const apple = await sharp(Buffer.from(svg)).resize(180, 180).png().toBuffer();
  writeFileSync(join(kantaPublic, 'apple-icon.png'), apple);
  console.log('Wrote kanta/public/favicon.ico and apple-icon.png');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
