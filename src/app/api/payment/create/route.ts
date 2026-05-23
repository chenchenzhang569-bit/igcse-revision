import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPagePayForm, generateTradeNo } from "@/lib/alipay";
import type { NextRequest } from "next/server";

const PRICE_PER_SUBJECT = 50;
const PRICE_ALL = 250;

function parseJwt(token: string) {
  try {
    const base64 = token.split(".")[1];
    return JSON.parse(Buffer.from(base64, "base64").toString());
  } catch { return null; }
}

export async function POST(request: NextRequest) {
  // Auth: try Authorization header first, then cookie
  let userId: string | null = null;

  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const payload = parseJwt(token);
    userId = payload?.sub || null;
  }

  if (!userId) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return request.cookies.getAll(); }, setAll() {} } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id || null;
  }

  if (!userId) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const body = await request.json();
  const { subjectId, plan } = body;

  // Admin client for DB writes (bypasses RLS)
  const admin = createAdminClient();

  if (plan === "all") {
    const tradeNo = generateTradeNo();
    const { error } = await admin.from("purchases").insert({
      user_id: userId,
      subject_id: null,
      amount_cny: PRICE_ALL * 100,
      alipay_trade_no: tradeNo,
      status: "pending",
    });
    if (error) {
      console.error("All plan insert error:", error);
      return NextResponse.json({ error: "创建订单失败" }, { status: 500 });
    }
    const formHtml = createPagePayForm({
      outTradeNo: tradeNo,
      totalAmount: String(PRICE_ALL) + ".00",
      subject: "IGCSE All Subjects — Lifetime Access",
      body: "CAIE + Edexcel all subjects",
    });
    return new NextResponse(formHtml, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  if (!subjectId) return NextResponse.json({ error: "缺少科目ID" }, { status: 400 });

  // Lookup subject (anon client is fine for select)
  const { data: subject } = await admin
    .from("subjects")
    .select("id, display_name, slug")
    .eq("id", subjectId)
    .maybeSingle();

  if (!subject) return NextResponse.json({ error: "科目不存在" }, { status: 404 });

  // Check already purchased
  const { data: existing } = await admin
    .from("purchases")
    .select("id")
    .eq("user_id", userId)
    .eq("subject_id", subjectId)
    .in("status", ["paid", "trial"])
    .maybeSingle();

  if (existing) return NextResponse.json({ error: "您已购买该科目", paid: true }, { status: 409 });

  const tradeNo = generateTradeNo();
  const { error: insertError } = await admin.from("purchases").insert({
    user_id: userId,
    subject_id: subjectId,
    amount_cny: PRICE_PER_SUBJECT * 100,
    alipay_trade_no: tradeNo,
    status: "pending",
  });

  if (insertError) {
    console.error("Single subject insert error:", insertError);
    return NextResponse.json({ error: "创建订单失败" }, { status: 500 });
  }

  const formHtml = createPagePayForm({
    outTradeNo: tradeNo,
    totalAmount: String(PRICE_PER_SUBJECT),
    subject: `IGCSE ${subject.display_name}`,
    body: `IGCSE ${subject.display_name} 科目复习资料`,
  });

  return new NextResponse(formHtml, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
