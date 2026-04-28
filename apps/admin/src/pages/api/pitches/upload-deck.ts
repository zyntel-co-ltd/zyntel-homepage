import type { APIRoute } from 'astro';
import AdmZip from 'adm-zip';
import { lookup as lookupMime } from 'mime-types';
import { getPitchSessionByToken, updatePitchSession } from '../../../lib/pitches.ts';
import { putObject } from '../../../lib/r2.ts';

const MAX_UPLOAD_BYTES = 30 * 1024 * 1024;
const MAX_FILES = 400;

function safePath(input: string): string {
  const clean = String(input || '').replace(/\\/g, '/').replace(/^\/+/, '');
  const parts = clean.split('/').filter(Boolean);
  const ok = parts.filter((p) => p !== '.' && p !== '..');
  return ok.join('/');
}

function isAllowedPath(p: string): boolean {
  const lower = p.toLowerCase();
  return (
    lower.endsWith('.html') ||
    lower.endsWith('.css') ||
    lower.endsWith('.js') ||
    lower.endsWith('.json') ||
    lower.endsWith('.png') ||
    lower.endsWith('.jpg') ||
    lower.endsWith('.jpeg') ||
    lower.endsWith('.webp') ||
    lower.endsWith('.gif') ||
    lower.endsWith('.svg') ||
    lower.endsWith('.ico') ||
    lower.endsWith('.txt') ||
    lower.endsWith('.woff') ||
    lower.endsWith('.woff2') ||
    lower.endsWith('.ttf') ||
    lower.endsWith('.otf')
  );
}

function pickEntryPath(paths: string[]): string {
  const norm = paths.map((p) => p.replace(/\\/g, '/'));
  const index = norm.find((p) => p.toLowerCase().endsWith('index.html'));
  if (index) return index;
  const anyHtml = norm.find((p) => p.toLowerCase().endsWith('.html'));
  return anyHtml ?? 'index.html';
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const form = await request.formData();
    const token = String(form.get('token') ?? '').trim();
    const file = form.get('file');
    if (!token) return new Response(JSON.stringify({ error: 'token required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    if (!(file instanceof File)) return new Response(JSON.stringify({ error: 'file required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    if (file.size > MAX_UPLOAD_BYTES) return new Response(JSON.stringify({ error: 'File too large' }), { status: 413, headers: { 'Content-Type': 'application/json' } });

    const session = await getPitchSessionByToken(token);
    if (!session) return new Response(JSON.stringify({ error: 'Pitch session not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });

    const uploadId = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);
    const prefix = `pitches/${session.id}/${new Date().toISOString().slice(0, 10)}/${uploadId}`;

    const filename = String(file.name || 'upload').trim();
    const lowerName = filename.toLowerCase();
    const bytes = new Uint8Array(await file.arrayBuffer());

    let entryPath = 'index.html';
    let uploadedCount = 0;

    if (lowerName.endsWith('.zip') || file.type === 'application/zip' || file.type === 'application/x-zip-compressed') {
      const zip = new AdmZip(Buffer.from(bytes));
      const entries = zip.getEntries().filter((e) => !e.isDirectory);
      if (entries.length === 0) return new Response(JSON.stringify({ error: 'Zip is empty' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      if (entries.length > MAX_FILES) return new Response(JSON.stringify({ error: `Too many files in zip (max ${MAX_FILES})` }), { status: 400, headers: { 'Content-Type': 'application/json' } });

      const paths: string[] = [];
      for (const e of entries) {
        const p = safePath(e.entryName);
        if (!p) continue;
        if (!isAllowedPath(p)) continue;
        if (p.startsWith('__macosx/') || p.endsWith('.ds_store')) continue;
        paths.push(p);
      }
      if (!paths.length) return new Response(JSON.stringify({ error: 'No supported files found in zip' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      entryPath = pickEntryPath(paths);

      for (const e of entries) {
        const p = safePath(e.entryName);
        if (!p) continue;
        if (!isAllowedPath(p)) continue;
        if (p.startsWith('__macosx/') || p.endsWith('.ds_store')) continue;
        const content = e.getData();
        const key = `${prefix}/${p}`;
        const ct = lookupMime(p) ? String(lookupMime(p)) : undefined;
        await putObject({ key, body: new Uint8Array(content), contentType: ct });
        uploadedCount += 1;
      }
    } else {
      if (!isAllowedPath(filename)) {
        return new Response(JSON.stringify({ error: 'Unsupported file type. Upload a .zip or a single .html file.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
      entryPath = filename.toLowerCase().endsWith('.html') ? 'index.html' : safePath(filename);
      const key = `${prefix}/${entryPath}`;
      const ct = lookupMime(entryPath) ? String(lookupMime(entryPath)) : (file.type || undefined);
      await putObject({ key, body: bytes, contentType: ct });
      uploadedCount = 1;
    }

    await updatePitchSession(session.id, { r2Prefix: prefix, entryPath });

    return new Response(JSON.stringify({ ok: true, entryPath, uploadedCount }), { headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message ?? 'Upload failed' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

