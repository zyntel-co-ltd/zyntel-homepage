import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

function getRequiredEnv(name: string): string {
  const v = String((import.meta as any).env?.[name] ?? '').trim();
  if (!v) throw new Error(`${name} must be set`);
  return v;
}

export type R2Config = {
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
};

export function getR2Config(): R2Config {
  return {
    endpoint: getRequiredEnv('R2_ENDPOINT'),
    bucket: getRequiredEnv('R2_BUCKET'),
    accessKeyId: getRequiredEnv('R2_ACCESS_KEY_ID'),
    secretAccessKey: getRequiredEnv('R2_SECRET_ACCESS_KEY'),
  };
}

export function createR2Client(cfg: R2Config): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: cfg.endpoint,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
  });
}

export async function putObject(args: {
  key: string;
  body: Uint8Array;
  contentType?: string | null;
}): Promise<void> {
  const cfg = getR2Config();
  const client = createR2Client(cfg);
  await client.send(new PutObjectCommand({
    Bucket: cfg.bucket,
    Key: args.key,
    Body: args.body,
    ContentType: args.contentType ?? undefined,
  }));
}

export async function headObject(key: string): Promise<boolean> {
  const cfg = getR2Config();
  const client = createR2Client(cfg);
  try {
    await client.send(new HeadObjectCommand({ Bucket: cfg.bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

export async function getObjectStream(key: string) {
  const cfg = getR2Config();
  const client = createR2Client(cfg);
  const res = await client.send(new GetObjectCommand({ Bucket: cfg.bucket, Key: key }));
  return res;
}

