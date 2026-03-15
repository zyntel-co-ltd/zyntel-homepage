#!/usr/bin/env node
/**
 * Generate favicon.ico and favicon-32x32.png from favicon.svg for broader browser support.
 * Run: node scripts/generate-favicons.mjs
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
const webPublic = join(root, 'apps', 'web', 'public');
const adminPublic = join(root, 'apps', 'admin', 'public');
const svgPath = join(webPublic, 'favicon.svg');
const svg = readFileSync(svgPath, 'utf8');

async function main() {
  // 1. Generate favicon.ico (16, 24, 32, 48 for broad support)
  await svgToIco({
    input_name: svgPath,
    output_name: join(webPublic, 'favicon.ico'),
    sizes: [16, 24, 32, 48],
  });
  console.log('Created apps/web/public/favicon.ico');

  // 2. Generate favicon-32x32.png
  const png32 = await sharp(Buffer.from(svg))
    .resize(32, 32)
    .png()
    .toBuffer();
  writeFileSync(join(webPublic, 'favicon-32x32.png'), png32);
  console.log('Created apps/web/public/favicon-32x32.png');

  // 3. Copy to admin app
  const ico = readFileSync(join(webPublic, 'favicon.ico'));
  writeFileSync(join(adminPublic, 'favicon.ico'), ico);
  writeFileSync(join(adminPublic, 'favicon-32x32.png'), png32);
  console.log('Copied favicon.ico and favicon-32x32.png to apps/admin/public');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
