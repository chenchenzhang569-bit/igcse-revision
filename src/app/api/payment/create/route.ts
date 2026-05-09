import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createPagePayForm, generateTradeNo } from "@/lib/alipay";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(_cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[]) {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const body = await request.json();
  const { subjectId } = body;

  if (!subjectId) {
    return NextResponse.json({ error: "缺少科目ID" }, { status: 400 });
  }

  // 查询科目信息
  const { data: subject } = await supabase
    .from("subjects")
    .select("id, display_name, price_cny, slug")
    .eq("id", subjectId)
    .single();

  if (!subject) {
    return NextResponse.json({ error: "科目不存在" }, { status: 404 });
  }

  // 检查是否已购买
  const { data: existing } = await supabase
    .from("purchases")
    .select("id")
    .eq("user_id", user.id)
    .eq("subject_id", subjectId)
    .eq("status", "paid")
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "您已购买该科目", paid: true }, { status: 409 });
  }

  // 创建订单
  const tradeNo = generateTradeNo();
  const amount = (subject.price_cny / 100).toFixed(2);

  const { error: insertError } = await supabase.from("purchases").insert({
    user_id: user.id,
    subject_id: subjectId,
    amount_cny: subject.price_cny,
    alipay_trade_no: tradeNo,
    status: "pending",
  });

  if (insertError) {
    return NextResponse.json({ error: "创建订单失败" }, { status: 500 });
  }

  // 生成支付宝支付表单
  const formHtml = createPagePayForm({
    outTradeNo: tradeNo,
    totalAmount: amount,
    subject: `IGCSE ${subject.display_name}`,
    body: `IGCSE ${subject.display_name} 科目复习资料`,
  });

  return new NextResponse(formHtml, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
