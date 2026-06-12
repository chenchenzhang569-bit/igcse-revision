import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

const R2 = new S3Client({
  region: "auto",
  endpoint: "https://7524670a3d7d50fd979765dedb5b378d.r2.cloudflarestorage.com",
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY || "baf9fd99dfe0501ceb0f8da65bccfbfc",
    secretAccessKey: process.env.R2_SECRET_KEY || "a53c8d8f542bdcf7049f9281ce987680208387ad0d56a20ddbba57881b144b80",
  },
});

const MOCK_FILES: Record<string, string> = {
  "edexcel-chemistry-4ch1": "mock/edexcel_chem_mock_questions.json",
  "edexcel-physics-4ph1": "mock/edexcel_phys_mock_questions.json",
  "edexcel-biology-4bi1": "mock/edexcel_bio_mock_questions.json",
  "edexcel-mathematics-4ma1": "mock/edexcel_4ma1_foundation_mock_questions.json",
  "edexcel-mathematics-higher-4ma1": "mock/edexcel_4ma1_higher_mock_questions.json",
  "edexcel-business-4bs1": "mock/edexcel_business_4bs1_mock_questions.json",
};

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  if (!slug || !MOCK_FILES[slug]) {
    return NextResponse.json({ error: "Unknown subject" }, { status: 404 });
  }

  // Check authentication + purchase
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: subjectRow } = await supabase
      .from("subjects")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (subjectRow) {
      const { data: purchases } = await supabase
        .from("purchases")
        .select("id, subject_id, expires_at")
        .eq("user_id", user.id)
        .in("status", ["paid", "trial"]);

      const now = new Date();
      const hasAccess = purchases?.some(p =>
        (!p.subject_id && (!p.expires_at || new Date(p.expires_at) > now)) ||
        (p.subject_id === subjectRow.id && (!p.expires_at || new Date(p.expires_at) > now))
      );

      if (!hasAccess) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
  } catch {
    return NextResponse.json({ error: "Auth check failed" }, { status: 401 });
  }

  // Fetch from R2
  try {
    const cmd = new GetObjectCommand({
      Bucket: "sme-images",
      Key: MOCK_FILES[slug],
    });
    const resp = await R2.send(cmd);
    const body = await resp.Body!.transformToString("utf-8");
    return NextResponse.json(JSON.parse(body));
  } catch (e) {
    return NextResponse.json({ error: "R2 fetch failed" }, { status: 500 });
  }
}
