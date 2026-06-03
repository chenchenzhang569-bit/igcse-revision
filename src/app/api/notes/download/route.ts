import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getR2PresignedUrl } from "@/lib/r2";
import { logDownload } from "@/lib/download-logger";

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
    .select("id, title, file_url, file_name, is_free_preview, subject_id")
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

    const subjectId = (note as any).subject_id;

    // 查看用户所有购买记录（一次查出，JS 里判断）— 跟 page.tsx 一致
    const { data: purchases } = await supabase
      .from("purchases")
      .select("subject_id, expires_at")
      .eq("user_id", user.id)
      .in("status", ["paid", "trial"]);

    if (!purchases || purchases.length === 0) {
      return NextResponse.json({ error: "请先购买该科目" }, { status: 402 });
    }

    const now = new Date();
    const hasValidPurchase = purchases.some(p => {
      if (p.expires_at && new Date(p.expires_at) < now) return false;
      // all-subjects plan covers everything
      if (!p.subject_id) return true;
      // specific subject match
      return subjectId && p.subject_id === subjectId;
    });

    if (!hasValidPurchase) {
      return NextResponse.json({ error: "请先购买该科目" }, { status: 402 });
    }
  }

  // 用 R2 签名 URL 替代直接重定向
  const r2Url = await getR2PresignedUrl(note.file_url);
  if (!r2Url) {
    return NextResponse.json({ error: "文件链接异常" }, { status: 500 });
  }

  // Fire-and-forget download log (best effort, after response)
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    logDownload({
      userId: user.id,
      noteId: noteId,
      fileName: (note as any)?.file_name || (note as any)?.title || "",
      subjectId: (note as any)?.subject_id || "",
      pageUrl: req.url,
    }).catch(() => {});
  }

  return NextResponse.redirect(r2Url);
}
