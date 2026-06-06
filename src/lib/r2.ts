import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || "7524670a3d7d50fd979765dedb5b378d";
const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY || "baf9fd99dfe0501ceb0f8da65bccfbfc";
const R2_SECRET_KEY = process.env.R2_SECRET_KEY || "";

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY,
    secretAccessKey: R2_SECRET_KEY,
  },
});

// 签名过期时间：1 小时
const PRESIGNED_TTL = 3600;

/**
 * Parse a Supabase Storage URL to extract bucket and key.
 * E.g. "https://aondldqwwvttwpervrfq.supabase.co/storage/v1/object/public/past-papers/0580/2018/0580_m18_qp_12.pdf"
 * => { bucket: "past-papers", key: "0580/2018/0580_m18_qp_12.pdf" }
 */
function parseStorageUrl(url: string): { bucket: string; key: string } | null {
  const match = url.match(/\/object\/public\/([^/]+)\/(.+)/);
  if (!match) return null;
  return { bucket: match[1], key: match[2] };
}

/**
 * Parse an r2:// URL to extract bucket and key.
 * E.g. "r2://past-papers/0580/2018/0580_m18_qp_12.pdf"
 * => { bucket: "past-papers", key: "0580/2018/0580_m18_qp_12.pdf" }
 */
function parseR2Url(url: string): { bucket: string; key: string } | null {
  if (!url.startsWith("r2://")) return null;
  const rest = url.slice(5); // remove "r2://"
  const slashIdx = rest.indexOf("/");
  if (slashIdx < 0) return null;
  return { bucket: rest.slice(0, slashIdx), key: rest.slice(slashIdx + 1) };
}

type ParsedFile = { bucket: string; key: string };

/**
 * Parse any supported file_url format into bucket + key.
 */
function parseFileUrl(fileUrl: string): ParsedFile | null {
  // New format: r2://bucket/key
  const r2 = parseR2Url(fileUrl);
  if (r2) return r2;
  // Old format: Supabase Storage URL
  const supabase = parseStorageUrl(fileUrl);
  if (supabase) return supabase;
  // Unknown format
  console.error("Unrecognized file_url format:", fileUrl);
  return null;
}

/**
 * Generate a presigned R2 URL (1 hour TTL) from a supported file_url.
 * Supports both:
 *   - Supabase Storage URL: ".../public/past-papers/path/file.pdf"
 *   - R2 key: "r2://past-papers/path/file.pdf"
 */
export async function getR2PresignedUrl(fileUrl: string): Promise<string | null> {
  const parsed = parseFileUrl(fileUrl);
  if (!parsed) return null;
  const command = new GetObjectCommand({ Bucket: parsed.bucket, Key: parsed.key });
  return getSignedUrl(s3, command, { expiresIn: PRESIGNED_TTL });
}

/**
 * Upload a buffer to R2. Returns the r2:// URL to store in DB.
 * E.g. uploadToR2("past-papers", "0580/2024/file.pdf", buffer, "application/pdf")
 * => "r2://past-papers/0580/2024/file.pdf"
 */
export async function uploadToR2(
  bucket: string,
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
  });
  await s3.send(command);
  return `r2://${bucket}/${key}`;
}

/**
 * Delete a file from R2 given a supported file_url (Supabase Storage URL or r2://).
 */
export async function deleteFromR2ByUrl(fileUrl: string): Promise<void> {
  const parsed = parseFileUrl(fileUrl);
  if (!parsed) return;
  const command = new DeleteObjectCommand({ Bucket: parsed.bucket, Key: parsed.key });
  await s3.send(command);
}

/**
 * Delete a file from R2 given bucket + key directly.
 */
export async function deleteFromR2(bucket: string, key: string): Promise<void> {
  const command = new DeleteObjectCommand({ Bucket: bucket, Key: key });
  await s3.send(command);
}
