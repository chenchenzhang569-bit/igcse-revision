import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";

// POST /api/payment/trial/start
export async function POST(request: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll() {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const body = await request.json();
  const { subjectId } = body;
  if (!subjectId) return NextResponse.json({ error: "缺少科目ID" }, { status: 400 });

  // 检查是否已经用过 trial
  const { data: existing } = await supabase
    .from("purchases")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "trial")
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "您已经使用过免费试用" }, { status: 409 });
  }

  // 查询科目
  const { data: subject } = await supabase
    .from("subjects")
    .select("id, display_name")
    .eq("id", subjectId)
    .single();

  if (!subject) return NextResponse.json({ error: "科目不存在" }, { status: 404 });

  // 7天后过期
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { error } = await supabase.from("purchases").insert({
    user_id: user.id,
    subject_id: subjectId,
    amount_cny: 0,
    alipay_trade_no: `TRIAL_${Date.now()}`,
    status: "trial",
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    return NextResponse.json({ error: "创建试用失败" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    subject: subject.display_name,
    expiresAt: expiresAt.toISOString(),
  });
}
