import type { APIRoute } from 'astro';
import { sql } from '@zyntel/db';
import { updateServiceClient } from '../../../lib/maintenance.ts';
import { createHash, randomBytes } from 'crypto';
import { encryptString } from '../../../lib/admin-crypto.ts';

function generateApiKey(): string {
  return randomBytes(32).toString('hex');
}

function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const { id } = await request.json();
    if (!id) {
      return new Response(JSON.stringify({ error: 'id required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const newKey = generateApiKey();
    const keyHash = hashApiKey(newKey);
    let apiKeyEncrypted: string | null = null;
    try {
      // Optional: enables pull-mode and avoids storing plaintext.
      apiKeyEncrypted = encryptString(newKey);
    } catch {
      apiKeyEncrypted = null;
    }

    await updateServiceClient(id, { apiKeyHash: keyHash, apiKeyEncrypted });

    return new Response(
      JSON.stringify({
        apiKey: newKey,
        warning:
          'This key is shown only once. Update ZYNTEL_API_KEY on the client server immediately.',
        storedEncrypted: Boolean(apiKeyEncrypted),
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message ?? 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
