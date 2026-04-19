#!/usr/bin/env node
/**
 * Favicon set for pulse app (Next.js) from homepage favicon.svg.
 * Run from zyntel-homepage repo root: node scripts/emit-pulse-icons.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import sharp from 'sharp';

const require = createRequire(import.meta.url);
const svgToIco = require('svg-to-ico');

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const srcSvg = join(root, 'apps', 'web', 'public', 'favicon.svg');
const pulsePublic = join(root, '..', 'pulse', 'public');
mkdirSync(pulsePublic, { recursive: true });

async function main() {
  await svgToIco({
    input_name: srcSvg,
    output_name: join(pulsePublic, 'favicon.ico'),
    sizes: [16, 24, 32, 48],
  });
  const svg = readFileSync(srcSvg);
  const png32 = await sharp(Buffer.from(svg)).resize(32, 32).png().toBuffer();
  writeFileSync(join(pulsePublic, 'favicon-32x32.png'), png32);
  const apple = await sharp(Buffer.from(svg)).resize(180, 180).png().toBuffer();
  writeFileSync(join(pulsePublic, 'apple-touch-icon.png'), apple);
  writeFileSync(join(pulsePublic, 'favicon.svg'), svg);
  console.log('Wrote pulse/public favicon.ico, favicon.svg, favicon-32x32.png, apple-touch-icon.png');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
