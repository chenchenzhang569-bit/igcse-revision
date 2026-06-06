import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-auth";
import { uploadToR2 } from "@/lib/r2";

export async function POST(req: NextRequest) {
  const authErr = await requireAdmin();
  if (authErr) return authErr;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const topic_id = formData.get("topic_id") as string;
    const subtopic_id = formData.get("subtopic_id") as string;
    const title = formData.get("title") as string;
    const content = formData.get("content") as string;
    const doc_type = formData.get("doc_type") as string || "notes";
    const is_free_preview = formData.get("is_free_preview") === "true";
    const subject_id = formData.get("subject_id") as string;

    if (!file || !topic_id || !title) {
      return NextResponse.json({ error: "缺少必填字段" }, { status: 400 });
    }

    if (!file.type.includes("pdf") && !file.name.endsWith(".pdf")) {
      return NextResponse.json({ error: "只支持 PDF 文件" }, { status: 400 });
    }

    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: "文件不能超过 50MB" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // 上传到 R2
    const filePath = `${topic_id}/${Date.now()}_${file.name}`;
    const r2Url = await uploadToR2("notes-pdfs", filePath, buffer, "application/pdf");

    // 存入 notes 表
    const supabase = createAdminClient();
    const { data: note, error: dbError } = await supabase
      .from("notes")
      .insert({
        topic_id,
        subject_id: subject_id || null,
        subtopic_id: subtopic_id || null,
        title: title || file.name.replace(/\.pdf$/i, ""),
        content: `[type:${doc_type}]${content || ""}`,
        file_url: r2Url,
        file_name: file.name,
        is_free_preview,
      })
      .select()
      .single();

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json(note, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
