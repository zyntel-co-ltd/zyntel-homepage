import type { APIRoute } from 'astro';
import { createHash } from 'crypto';
import { getServiceClientById } from '../../../lib/maintenance.ts';
import { insertAppEvent } from '../../../lib/app-events.ts';
import type { AppEventLevel, AppEventType } from '../../../lib/app-events.ts';

function sha256Hex(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

const ALLOWED_LEVELS: AppEventLevel[] = ['debug', 'info', 'warn', 'error', 'critical'];

function coerceLevel(v: unknown): AppEventLevel {
  return ALLOWED_LEVELS.includes(v as AppEventLevel) ? (v as AppEventLevel) : 'info';
}

/**
 * POST /api/logs/ingest
 *
 * Accepts structured events from any Zyntel app. Auth via X-Zyntel-Key (same
 * key as ROI ingest — validated against service_clients.api_key_hash).
 *
 * Body (single event):
 *   { serviceClientId, app, eventType, message, level?, environment?,
 *     data?, source?, actor?, occurredAt? }
 *
 * Body (batch):
 *   { serviceClientId, events: [{ app, eventType, message, ... }, ...] }
 */
export const POST: APIRoute = async ({ request }) => {
  const apiKey = String(
    request.headers.get('x-zyntel-key') ?? request.headers.get('X-Zyntel-Key') ?? ''
  ).trim();

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Missing X-Zyntel-Key' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: any = null;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const serviceClientId = String(body?.serviceClientId ?? '').trim();
  if (!serviceClientId) {
    return new Response(JSON.stringify({ error: 'serviceClientId required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const client = await getServiceClientById(serviceClientId);
  if (!client) {
    return new Response(JSON.stringify({ error: 'Service client not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const expected = client.apiKeyHash ? String(client.apiKeyHash) : '';
  if (!expected || sha256Hex(apiKey) !== expected) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Support both single-event and batch ({ events: [...] }) bodies
  const rawEvents: any[] = Array.isArray(body?.events) ? body.events : [body];

  const stored: string[] = [];
  const skipped: string[] = [];

  for (const e of rawEvents) {
    const app = String(e?.app ?? '').trim();
    const eventType = String(e?.eventType ?? '').trim() as AppEventType;
    const message = String(e?.message ?? '').trim();

    if (!app || !eventType || !message) {
      skipped.push(`missing app/eventType/message`);
      continue;
    }

    const occurredAtRaw = e?.occurredAt ? new Date(e.occurredAt) : null;
    const occurredAt = occurredAtRaw && !isNaN(occurredAtRaw.getTime()) ? occurredAtRaw : null;

    try {
      const inserted = await insertAppEvent({
        serviceClientId,
        app,
        environment: String(e?.environment ?? 'production'),
        eventType,
        level: coerceLevel(e?.level),
        message,
        data: e?.data && typeof e.data === 'object' && !Array.isArray(e.data) ? e.data : null,
        source: e?.source ? String(e.source) : null,
        actor: e?.actor ? String(e.actor) : null,
        occurredAt,
      });
      stored.push(inserted.id);
    } catch (err: any) {
      skipped.push(err?.message ?? 'insert failed');
    }
  }

  return new Response(JSON.stringify({ ok: true, stored: stored.length, skipped }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
