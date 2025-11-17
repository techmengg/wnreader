import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const bucket = process.env.S3_BUCKET_NAME;
const region = process.env.S3_REGION;
const accessKeyId = process.env.S3_ACCESS_KEY_ID;
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
const endpoint = process.env.S3_ENDPOINT;

if (!bucket || !region || !accessKeyId || !secretAccessKey) {
  // We intentionally don't throw here to avoid breaking builds,
  // but API routes that rely on storage should validate configuration.
  // eslint-disable-next-line no-console
  console.warn(
    "[storage] Missing S3 configuration. Set S3_BUCKET_NAME, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY."
  );
}

export const s3Client = new S3Client({
  region,
  endpoint,
  forcePathStyle: Boolean(endpoint),
  credentials: accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined,
});

export async function createUploadUrl(opts: {
  key: string;
  contentType: string;
  expiresInSeconds?: number;
}): Promise<string> {
  if (!bucket) {
    throw new Error("S3_BUCKET_NAME is not configured");
  }

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: opts.key,
    ContentType: opts.contentType,
  });

  return getSignedUrl(s3Client, command, {
    expiresIn: opts.expiresInSeconds ?? 60 * 10,
  });
}

export async function createDownloadUrl(opts: {
  key: string;
  expiresInSeconds?: number;
}): Promise<string> {
  if (!bucket) {
    throw new Error("S3_BUCKET_NAME is not configured");
  }

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: opts.key,
  });

  return getSignedUrl(s3Client, command, {
    expiresIn: opts.expiresInSeconds ?? 60 * 10,
  });
}

