import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

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

const CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  "svg+xml": "image/svg+xml",
};

async function fetchFromR2(bucket: string, key: string): Promise<{ body: Uint8Array; contentType: string } | null> {
  try {
    const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
    const resp = await s3.send(cmd);
    const body = await resp.Body!.transformToByteArray();
    return {
      body,
      contentType: resp.ContentType || guessContentType(key),
    };
  } catch {
    return null;
  }
}

function guessContentType(key: string): string {
  const ext = key.split(".").pop()?.toLowerCase() || "";
  return CONTENT_TYPES[ext] || "application/octet-stream";
}

/**
 * Serve images from R2 directly (no presigned URL).
 * Usage: /api/r2/img?bucket=sme-images&key=mock/{hash}.{ext}
 *
 * Handles the %2B encoding bug: browser decodes %2B → + in query params,
 * but R2 key may store literal %2B. Retries with + → %2B substitution.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const bucket = searchParams.get("bucket");
  const key = searchParams.get("key");

  if (!bucket || !key) {
    return NextResponse.json({ error: "Missing bucket or key" }, { status: 400 });
  }

  function respond(data: { body: Uint8Array; contentType: string }) {
    return new NextResponse(Buffer.from(data.body), {
      headers: {
        "Content-Type": data.contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }

  // First try: key as received
  let result = await fetchFromR2(bucket, key);
  if (result) return respond(result);

  // Retry: if key contains '+', browser might have decoded %2B → +
  // R2 may have stored literal %2B in key
  const reEncoded = key.replace(/\+/g, "%2B");
  if (reEncoded !== key) {
    result = await fetchFromR2(bucket, reEncoded);
    if (result) return respond(result);
  }

  return NextResponse.json({ error: "Image not found" }, { status: 404 });
}
