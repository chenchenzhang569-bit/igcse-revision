import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const noteId = searchParams.get("id");

  if (!noteId) {
    return NextResponse.json({ error: "缺少笔记 ID" }, { status: 400 });
  }

  const supabase = createClient();

  // 查笔记
  const { data: note, error } = await supabase
    .from("notes")
    .select("id, title, file_url, file_name, is_free_preview, topic_id, topics!inner(subject_id)")
    .eq("id", noteId)
    .single();

  if (error || !note) {
    return NextResponse.json({ error: "笔记不存在" }, { status: 404 });
  }

  if (!note.file_url) {
    return NextResponse.json({ error: "该笔记没有 PDF 附件" }, { status: 404 });
  }

  // 检查权限：免费预览 OR 已购买
  if (!note.is_free_preview) {
    // 使用 cookie session 检查登录
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const subjectId = (note as any).topics.subject_id;

    // Check specific subject purchase
    const { data: purchase } = await supabase
      .from("purchases")
      .select("id, expires_at")
      .eq("user_id", user.id)
      .eq("subject_id", subjectId)
      .in("status", ["paid", "trial"])
      .maybeSingle();

    if (!purchase) {
      // Also check all-subjects plan
      const { data: allSubjects } = await supabase
        .from("purchases")
        .select("id, expires_at")
        .eq("user_id", user.id)
        .is("subject_id", null)
        .in("status", ["paid", "trial"])
        .maybeSingle();

      if (!allSubjects) {
        return NextResponse.json({ error: "请先购买该科目" }, { status: 402 });
      }

      if (allSubjects.expires_at && new Date(allSubjects.expires_at) < new Date()) {
        return NextResponse.json({ error: "购买已过期，请重新购买" }, { status: 402 });
      }
    } else if (purchase.expires_at && new Date(purchase.expires_at) < new Date()) {
      return NextResponse.json({ error: "购买已过期，请重新购买" }, { status: 402 });
    }
  }

  // 重定向到 Supabase Storage URL
  return NextResponse.redirect(note.file_url);
}
