import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  const authErr = await requireAdmin();
  if (authErr) return authErr;

  try {
    const formData = await req.formData();
    const fileQ = formData.get("file_q") as File | null;
    const fileA = formData.get("file_a") as File | null;
    const subject_id = formData.get("subject_id") as string;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const duration_minutes = parseInt(formData.get("duration_minutes") as string) || null;
    const total_marks = parseInt(formData.get("total_marks") as string) || null;
    const is_free_preview = formData.get("is_free_preview") === "true";

    if (!fileQ || !subject_id || !title) {
      return NextResponse.json({ error: "缺少必填字段（试卷 PDF 必填）" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const ts = Date.now();
    let fileUrl = "";
    let answerUrl = "";

    // 上传试卷
    const qPath = `${subject_id}/${ts}_question.pdf`;
    const qBuf = Buffer.from(await fileQ.arrayBuffer());
    const { error: qErr } = await supabase.storage.from("mock-exams").upload(qPath, qBuf, { contentType: "application/pdf", upsert: false });
    if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });
    const { data: qUrl } = supabase.storage.from("mock-exams").getPublicUrl(qPath);
    fileUrl = qUrl.publicUrl;

    // 上传答案（可选）
    if (fileA) {
      const aPath = `${subject_id}/${ts}_answer.pdf`;
      const aBuf = Buffer.from(await fileA.arrayBuffer());
      const { error: aErr } = await supabase.storage.from("mock-exams").upload(aPath, aBuf, { contentType: "application/pdf", upsert: false });
      if (!aErr) {
        const { data: aUrl } = supabase.storage.from("mock-exams").getPublicUrl(aPath);
        answerUrl = aUrl.publicUrl;
      }
    }

    const { data, error } = await supabase.from("mock_exams").insert({
      subject_id, title, description: description || null,
      file_url: fileUrl, answer_url: answerUrl || null,
      duration_minutes, total_marks, is_free_preview,
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
