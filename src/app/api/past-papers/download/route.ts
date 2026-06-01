import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const paperId = searchParams.get("id");

  if (!paperId) {
    return NextResponse.json({ error: "缺少试卷 ID" }, { status: 400 });
  }

  const supabase = createClient();

  // 查试卷
  const { data: paper, error } = await supabase
    .from("past_papers")
    .select("id, subject_id, file_url, title, is_free")
    .eq("id", paperId)
    .single();

  if (error || !paper) {
    return NextResponse.json({ error: "试卷不存在" }, { status: 404 });
  }

  if (!paper.file_url) {
    return NextResponse.json({ error: "该试卷没有 PDF 附件" }, { status: 404 });
  }

  // 使用 cookie session 检查登录
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json(
      { error: "请先登录", loginUrl: "/login" },
      { status: 401 }
    );
  }

  // 查看用户是否有该科目的购买记录
  const { data: purchase } = await supabase
    .from("purchases")
    .select("id, expires_at")
    .eq("user_id", user.id)
    .eq("subject_id", paper.subject_id)
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
      return NextResponse.json(
      {
        error: "请先购买该科目",
        subjectId: paper.subject_id,
      },
      { status: 402 }
    );
    }

    // Check if all-subjects plan is expired
    if (allSubjects.expires_at && new Date(allSubjects.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "购买已过期，请重新购买" },
        { status: 402 }
      );
    }
  } else {
    // 检查是否过期
    if (purchase.expires_at && new Date(purchase.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "购买已过期，请重新购买" },
        { status: 402 }
      );
    }
  }

  // 重定向到文件
  return NextResponse.redirect(paper.file_url);
}
