import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-auth";

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

    if (!file || !topic_id || !title) {
      return NextResponse.json({ error: "缺少必填字段" }, { status: 400 });
    }

    // 只允许 PDF
    if (!file.type.includes("pdf") && !file.name.endsWith(".pdf")) {
      return NextResponse.json({ error: "只支持 PDF 文件" }, { status: 400 });
    }

    // 限制 50MB
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: "文件不能超过 50MB" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const buffer = Buffer.from(await file.arrayBuffer());

    // 上传到 Supabase Storage
    const filePath = `${topic_id}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("notes-pdfs")
      .upload(filePath, buffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // 获取公开 URL
    const { data: urlData } = supabase.storage
      .from("notes-pdfs")
      .getPublicUrl(filePath);

    // 存入 notes 表 (store doc_type in content as prefix)
    const { data: note, error: dbError } = await supabase
      .from("notes")
      .insert({
        topic_id,
        subtopic_id: subtopic_id || null,
        title: title || file.name.replace(/\.pdf$/i, ""),
        content: `[type:${doc_type}]${content || ""}`,
        file_url: urlData.publicUrl,
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
