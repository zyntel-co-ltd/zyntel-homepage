import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, dirname, resolve } from 'node:path';

/**
 * Loads the full Zyntel logo for PDF embedding.
 * Tries the filesystem first (reliable in dev + Railway), then HTTP fallback.
 * Prefers full_zyntel_800w_transparent.png (dark text, transparent bg — ideal for white paper).
 */
export async function loadPdfLogo(baseUrl?: string): Promise<Uint8Array | null> {
  // Build a list of candidate filesystem paths to try
  const candidates: string[] = [];

  try {
    const __dir = dirname(fileURLToPath(import.meta.url));

    // Dev layout:  src/lib/ → ../../public/logos/
    candidates.push(join(__dir, '../../public/logos/full_zyntel_800w_transparent.png'));
    candidates.push(join(__dir, '../../public/logos/zyntel_full_black.png'));

    // Astro standalone build layout: dist/server/chunks/ → ../../client/logos/
    candidates.push(join(__dir, '../../client/logos/full_zyntel_800w_transparent.png'));
    candidates.push(join(__dir, '../../client/logos/zyntel_full_black.png'));
  } catch { /* import.meta.url not available — skip */ }

  // process.cwd() paths (works reliably on Railway where cwd = app root)
  candidates.push(resolve(process.cwd(), 'public/logos/full_zyntel_800w_transparent.png'));
  candidates.push(resolve(process.cwd(), 'public/logos/zyntel_full_black.png'));
  candidates.push(resolve(process.cwd(), 'dist/client/logos/full_zyntel_800w_transparent.png'));
  candidates.push(resolve(process.cwd(), 'dist/client/logos/zyntel_full_black.png'));

  for (const p of candidates) {
    try {
      const buf = await readFile(p);
      return new Uint8Array(buf);
    } catch { /* try next */ }
  }

  // HTTP fallback (self-fetch) — last resort
  if (baseUrl) {
    const paths = [
      '/logos/full_zyntel_800w_transparent.png',
      '/logos/zyntel_full_black.png',
      '/logos/zyntel_full_cyan.png',
    ];
    for (const p of paths) {
      try {
        const res = await fetch(`${baseUrl.replace(/\/$/, '')}${p}`);
        if (res.ok) return new Uint8Array(await res.arrayBuffer());
      } catch { /* try next */ }
    }
  }

  return null;
}
