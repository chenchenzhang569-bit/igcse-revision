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

  // 查看用户所有购买记录（一次查出，JS 里判断）
  const { data: purchases } = await supabase
    .from("purchases")
    .select("subject_id, expires_at")
    .eq("user_id", user.id)
    .in("status", ["paid", "trial"]);

  if (!purchases || purchases.length === 0) {
    return NextResponse.json(
      { error: "请先购买该科目", subjectId: paper.subject_id },
      { status: 402 }
    );
  }

  const now = new Date();
  const hasValidPurchase = purchases.some(p => {
    if (p.expires_at && new Date(p.expires_at) < now) return false;
    // all-subjects plan covers everything
    if (!p.subject_id) return true;
    // specific subject match
    return p.subject_id === paper.subject_id;
  });

  if (!hasValidPurchase) {
    return NextResponse.json(
      { error: "请先购买该科目", subjectId: paper.subject_id },
      { status: 402 }
    );
  }

  // 重定向到文件
  return NextResponse.redirect(paper.file_url);
}
