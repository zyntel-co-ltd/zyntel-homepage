import type { APIRoute } from 'astro';
import { gzipSync } from 'zlib';
import { getEventsForArchival, markEventsArchived, deleteArchivedEvents } from '../../../lib/app-events.ts';
import { putObject } from '../../../lib/r2.ts';

/**
 * POST /api/logs/archive
 *
 * Called by a nightly cron (or manually). Protected by INVOICE_API_KEY — admin-internal only.
 * Compresses app_events older than 90 days into per-client per-month gzip blobs,
 * uploads to R2 under logs/{serviceClientId}/{year}/{month}-archive.json.gz,
 * marks rows with r2_key, then deletes them from Neon.
 */
export const POST: APIRoute = async ({ request }) => {
  const apiKey = request.headers.get('x-api-key') ?? request.headers.get('authorization')?.replace('Bearer ', '');
  if (import.meta.env.INVOICE_API_KEY && apiKey !== import.meta.env.INVOICE_API_KEY) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const events = await getEventsForArchival(90);

    if (events.length === 0) {
      const deleted = await deleteArchivedEvents(90);
      return new Response(JSON.stringify({ ok: true, archived: 0, deleted, message: 'Nothing to archive.' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Group by serviceClientId + YYYY-MM so each month gets one compressed file
    const groups = new Map<string, typeof events>();
    for (const ev of events) {
      const ym = ev.occurredAt.toISOString().slice(0, 7); // YYYY-MM
      const key = `${ev.serviceClientId}::${ym}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(ev);
    }

    let archivedCount = 0;
    for (const [groupKey, groupEvents] of groups) {
      const [clientId, ym] = groupKey.split('::');
      const [year, month] = ym.split('-');
      const r2Key = `logs/${clientId}/${year}/${month}-archive.json.gz`;

      const compressed = gzipSync(Buffer.from(JSON.stringify(groupEvents)));
      await putObject({ key: r2Key, body: new Uint8Array(compressed), contentType: 'application/gzip' });

      const ids = groupEvents.map((e) => e.id);
      await markEventsArchived(ids, r2Key);
      archivedCount += ids.length;
    }

    const deleted = await deleteArchivedEvents(90);

    return new Response(JSON.stringify({ ok: true, archived: archivedCount, deleted }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[logs/archive]', err);
    return new Response(JSON.stringify({ error: err?.message ?? 'Archive failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
