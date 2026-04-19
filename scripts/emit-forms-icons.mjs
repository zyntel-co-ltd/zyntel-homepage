#!/usr/bin/env node
/**
 * Generate favicon.ico, PNG sizes, and apple-touch for zyntel-forms from its SVG.
 * Run from zyntel-homepage repo root: node scripts/emit-forms-icons.mjs
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
const formsPublic = join(root, '..', 'zyntel-forms', 'public');
const svgPath = join(formsPublic, 'images', 'favicon.svg');

async function main() {
  await svgToIco({
    input_name: svgPath,
    output_name: join(formsPublic, 'favicon.ico'),
    sizes: [16, 24, 32, 48],
  });
  const svg = readFileSync(svgPath);
  const png32 = await sharp(Buffer.from(svg)).resize(32, 32).png().toBuffer();
  writeFileSync(join(formsPublic, 'favicon-32x32.png'), png32);
  const apple = await sharp(Buffer.from(svg)).resize(180, 180).png().toBuffer();
  writeFileSync(join(formsPublic, 'apple-touch-icon.png'), apple);
  console.log('Wrote zyntel-forms/public favicon.ico, favicon-32x32.png, apple-touch-icon.png');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
