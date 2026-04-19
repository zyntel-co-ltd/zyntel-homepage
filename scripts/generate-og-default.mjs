#!/usr/bin/env node
/**
 * Default Open Graph image (1200×630) — brand teal + headline.
 * Run from repo root: node scripts/generate-og-default.mjs
 */
import sharp from 'sharp';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const out = join(root, 'apps', 'web', 'public', 'og-default.png');

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#006064"/>
  <text x="600" y="280" text-anchor="middle" fill="#ffffff" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="56" font-weight="700">Zyntel</text>
  <text x="600" y="360" text-anchor="middle" fill="#e0f2f1" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="28" font-weight="500">Operational Intelligence Platform</text>
</svg>`;

const buf = await sharp(Buffer.from(svg)).png().toBuffer();
writeFileSync(out, buf);
console.log('Wrote', out);
