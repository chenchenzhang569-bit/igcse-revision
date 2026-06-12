import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || "7524670a3d7d50fd979765dedb5b378d";
const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY || "baf9fd99dfe0501ceb0f8da65bccfbfc";
const R2_SECRET_KEY = process.env.R2_SECRET_KEY || "a53c8d8f542bdcf7049f9281ce987680208387ad0d56a20ddbba57881b144b80";

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY, secretAccessKey: R2_SECRET_KEY },
});

// Map subject slug → R2 folder path
const SUBJECT_PATHS: Record<string, string> = {
  "edexcel-mathematics-4ma1": "igcse/maths/edexcel/sme-questions/foundation",
  "edexcel-mathematics-higher-4ma1": "igcse/maths/edexcel/sme-questions/higher",
  "edexcel-further-maths-4pm1": "igcse/maths/edexcel/sme-questions",
  "edexcel-economics-4ec1": "igcse/economics/edexcel/sme-questions",
  "edexcel-geography-4ge1": "igcse/geography/edexcel/sme-questions",
};

/**
 * GET /api/r2/questions/[subject]?subtopic_slug=xxx
 * Returns questions for a given subtopic from R2 JSON.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { subject: string } }
) {
  const subject = params.subject;
  const basePath = SUBJECT_PATHS[subject];
  if (!basePath) {
    return NextResponse.json({ error: "Subject not found" }, { status: 404 });
  }

  const { searchParams } = new URL(_req.url);
  const subtopicSlug = searchParams.get("subtopic_slug");

  try {
    if (subtopicSlug) {
      // Fetch single subtopic's questions
      const key = `${basePath}/${encodeURIComponent(subtopicSlug)}.json`;
      const cmd = new GetObjectCommand({ Bucket: "past-papers", Key: key });
      const obj = await s3.send(cmd);
      const body = await obj.Body?.transformToString();
      return NextResponse.json(body ? JSON.parse(body) : []);
    } else {
      return NextResponse.json({ error: "subtopic_slug required" }, { status: 400 });
    }
  } catch (err) {
    console.error("R2 fetch error:", err);
    return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
