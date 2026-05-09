import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  const authErr = await requireAdmin();
  if (authErr) return authErr;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const subject_id = formData.get("subject_id") as string;
    const title = formData.get("title") as string;
    const year = parseInt(formData.get("year") as string);
    const season = formData.get("season") as string;
    const paper_number = parseInt(formData.get("paper_number") as string);
    const paper_type = formData.get("paper_type") as string;
    const is_free = formData.get("is_free") === "true";

    if (!file || !subject_id || !title) {
      return NextResponse.json({ error: "缺少必填字段" }, { status: 400 });
    }

    if (!file.type.includes("pdf") && !file.name.endsWith(".pdf")) {
      return NextResponse.json({ error: "只支持 PDF 文件" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const buffer = Buffer.from(await file.arrayBuffer());

    const filePath = `${subject_id}/${year}_${season}_paper${paper_number}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("past-papers")
      .upload(filePath, buffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: urlData } = supabase.storage
      .from("past-papers")
      .getPublicUrl(filePath);

    const { data: paper, error: dbError } = await supabase
      .from("past_papers")
      .insert({
        subject_id,
        title,
        year,
        season,
        paper_number,
        paper_type,
        file_url: urlData.publicUrl,
        is_free: is_free ?? true,
      })
      .select()
      .single();

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json(paper, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
