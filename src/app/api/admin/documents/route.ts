import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { NextRequest } from "next/server";

function parseJwt(token: string) {
  try {
    const base64 = token.split(".")[1];
    return JSON.parse(Buffer.from(base64, "base64").toString());
  } catch { return null; }
}

async function checkAdmin(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const payload = parseJwt(token);
  const userId = payload?.sub;
  if (!userId) return null;

  const admin = createAdminClient();
  const { data } = await admin.from("user_roles").select("role").eq("user_id", userId).maybeSingle();
  return data?.role === "admin" ? admin : null;
}

// GET /api/admin/documents?type=notes|past_papers&subject_id=xxx&subtopic_id=xxx&page=1
export async function GET(request: NextRequest) {
  const admin = await checkAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "notes";
  const subjectId = searchParams.get("subject_id");
  const subtopicId = searchParams.get("subtopic_id");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 20;

  if (!subjectId) return NextResponse.json({ error: "Missing subject_id" }, { status: 400 });

  if (type === "past_papers") {
    const { data, error, count } = await admin
      .from("past_papers")
      .select("id, title, file_url, subject_id, created_at", { count: "exact" })
      .eq("subject_id", subjectId)
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      items: (data || []).map((d) => ({ ...d, type: "past_paper" })),
      total: count || 0, page, limit,
    });
  }

  // notes table — supports subtopic + doc type filter
  let query = admin
    .from("notes")
    .select("id, title, file_url, subject_id, topic_id, created_at", { count: "exact" })
    .eq("subject_id", subjectId)
    .order("created_at", { ascending: false });

  if (subtopicId) {
    query = query.eq("topic_id", subtopicId);
  }

  const { data, error, count } = await query.range((page - 1) * limit, page * limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    items: (data || []).map((d) => ({ ...d, type: "note" })),
    total: count || 0, page, limit,
  });
}

// DELETE /api/admin/documents?id=xxx&type=notes|past_papers
export async function DELETE(request: NextRequest) {
  const admin = await checkAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const type = searchParams.get("type") || "notes";

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const table = type === "past_papers" ? "past_papers" : "notes";
  const bucket = type === "past_papers" ? "past-papers" : "notes-pdfs";

  // Get file_url first to extract storage path
  const { data: record } = await admin.from(table).select("file_url").eq("id", id).maybeSingle();

  if (record?.file_url) {
    const url = new URL(record.file_url);
    // Extract path after bucket name: /storage/v1/object/public/bucket-name/path/to/file
    const parts = url.pathname.split("/");
    const bucketIdx = parts.findIndex((p) => p === bucket);
    if (bucketIdx >= 0) {
      const storagePath = parts.slice(bucketIdx + 1).join("/");
      await admin.storage.from(bucket).remove([storagePath]);
    }
  }

  const { error } = await admin.from(table).delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

// PATCH /api/admin/documents — edit metadata
export async function PATCH(request: NextRequest) {
  const admin = await checkAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { id, type, title, subject_id, subtopic_id } = body;

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const table = type === "past_papers" ? "past_papers" : "notes";
  const update: Record<string, any> = {};
  if (title !== undefined) update.title = title;
  if (subject_id !== undefined) update.subject_id = subject_id;
  if (subtopic_id !== undefined) update.subtopic_id = subtopic_id;

  const { error } = await admin.from(table).update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
