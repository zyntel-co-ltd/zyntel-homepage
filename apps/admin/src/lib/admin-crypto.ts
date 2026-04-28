import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

function getKey(): Buffer {
  const raw = String(import.meta.env.ADMIN_ENCRYPTION_KEY ?? '').trim();
  if (!raw) throw new Error('ADMIN_ENCRYPTION_KEY not configured');
  // Prefer base64 (32 bytes) but support hex
  let buf: Buffer;
  try {
    buf = Buffer.from(raw, 'base64');
    if (buf.length === 32) return buf;
  } catch {}
  buf = Buffer.from(raw, 'hex');
  if (buf.length !== 32) throw new Error('ADMIN_ENCRYPTION_KEY must be 32 bytes (base64 or hex)');
  return buf;
}

/**
 * AES-256-GCM envelope: base64(iv).base64(tag).base64(ciphertext)
 * Safe to store as TEXT.
 */
export function encryptString(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(Buffer.from(plaintext, 'utf8')), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${tag.toString('base64')}.${ct.toString('base64')}`;
}

export function decryptString(payload: string): string {
  const key = getKey();
  const [ivB64, tagB64, ctB64] = String(payload || '').split('.');
  if (!ivB64 || !tagB64 || !ctB64) throw new Error('Invalid ciphertext format');
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const ct = Buffer.from(ctB64, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString('utf8');
}

