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

    const buffer = Buffer.from(await file.arrayBuffer());

    // 上传到 R2
    const filePath = `${subject_id}/${year}_${season}_paper${paper_number}.pdf`;
    const r2Url = await uploadToR2("past-papers", filePath, buffer, "application/pdf");

    // 写入 DB
    const supabase = createAdminClient();
    const { data: paper, error: dbError } = await supabase
      .from("past_papers")
      .insert({
        subject_id,
        title,
        year,
        season,
        paper_number,
        paper_type,
        file_url: r2Url,
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
