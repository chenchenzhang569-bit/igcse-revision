import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = "https://aondldqwwvttwpervrfq.supabase.co";

// Known mock exam JSON files in Supabase Storage
const MOCK_FILES: Record<string, string> = {
  "edexcel-biology-4bi1":
    `${SUPABASE_URL}/storage/v1/object/public/sme-images/mock/edexcel_bio_mock_questions.json`,
};

/**
 * GET /api/r2/json/:subject
 * Returns mock exam questions JSON for a given subject.
 * Data stored in Supabase Storage (public bucket).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ subject: string }> }
) {
  const { subject } = await params;
  const fileUrl = MOCK_FILES[subject];

  if (!fileUrl) {
    return NextResponse.json({ error: "Subject not found" }, { status: 404 });
  }

  try {
    const resp = await fetch(fileUrl, { cache: "no-store" });
    if (!resp.ok) {
      return NextResponse.json({ error: "File not found in storage" }, { status: 404 });
    }
    const body = await resp.text();
    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e) {
    return NextResponse.json({ error: "Failed to fetch from storage" }, { status: 500 });
  }
}
