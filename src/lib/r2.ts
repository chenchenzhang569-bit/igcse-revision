import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || "7524670a3d7d50fd979765dedb5b378d";
const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY || "baf9fd99dfe0501ceb0f8da65bccfbfc";
const R2_SECRET_KEY = process.env.R2_SECRET_KEY || "a53c8d8f542bdcf7049f9281ce987680208387ad0d56a20ddbba57881b144b80";

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY,
    secretAccessKey: R2_SECRET_KEY,
  },
});

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
 * Generate a presigned R2 URL (1 hour TTL) from a Supabase Storage URL.
 */
export async function getR2PresignedUrl(supabaseUrl: string): Promise<string | null> {
  const parsed = parseStorageUrl(supabaseUrl);
  if (!parsed) return null;

  const command = new GetObjectCommand({
    Bucket: parsed.bucket,
    Key: parsed.key,
  });

  return getSignedUrl(s3, command, { expiresIn: 3600 });
}
