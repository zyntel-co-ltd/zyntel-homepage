#!/usr/bin/env node
/**
 * Generate favicon.ico and PNG sizes for mazra from public/favicon.svg.
 * Run from zyntel-homepage repo root: node scripts/emit-mazra-icons.mjs
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
const mazraPublic = join(root, '..', 'mazra', 'public');
const svgPath = join(mazraPublic, 'favicon.svg');

async function main() {
  await svgToIco({
    input_name: svgPath,
    output_name: join(mazraPublic, 'favicon.ico'),
    sizes: [16, 24, 32, 48],
  });
  const svg = readFileSync(svgPath);
  const p192 = await sharp(Buffer.from(svg)).resize(192, 192).png().toBuffer();
  writeFileSync(join(mazraPublic, 'icon-192.png'), p192);
  const apple = await sharp(Buffer.from(svg)).resize(180, 180).png().toBuffer();
  writeFileSync(join(mazraPublic, 'apple-touch-icon.png'), apple);
  console.log('Wrote mazra/public favicon.ico, icon-192.png, apple-touch-icon.png');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
