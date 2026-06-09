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

const MOCK_FILES: Record<string, { bucket: string; key: string }> = {
  "edexcel-biology-4bi1": { bucket: "sme-images", key: "mock/edexcel_bio_mock_questions.json" },
};

/**
 * GET /api/r2/json/:subject
 * Returns mock exam questions JSON for a given subject from R2.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ subject: string }> }
) {
  const { subject } = await params;
  const file = MOCK_FILES[subject];
  if (!file) {
    return NextResponse.json({ error: "Subject not found" }, { status: 404 });
  }

  try {
    const cmd = new GetObjectCommand({ Bucket: file.bucket, Key: file.key });
    const resp = await s3.send(cmd);
    const body = await resp.Body!.transformToString("utf-8");
    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e) {
    return NextResponse.json({ error: "Failed to fetch from R2" }, { status: 500 });
  }
}
