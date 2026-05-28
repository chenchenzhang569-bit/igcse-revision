import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPagePayUrl, generateTradeNo } from "@/lib/alipay";
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

  // Check Alipay env vars
  if (!process.env.ALIPAY_APP_ID) return NextResponse.json({ error: "ALIPAY_APP_ID 未配置" }, { status: 500 });
  if (!process.env.ALIPAY_PRIVATE_KEY) return NextResponse.json({ error: "ALIPAY_PRIVATE_KEY 未配置" }, { status: 500 });
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY 未配置" }, { status: 500 });

  const body = await request.json();
  const { subjectId, plan } = body;

  // Admin client for DB writes (bypasses RLS)
  const admin = createAdminClient();

  if (plan === "all") {
    // 计算升级差价：已付单科总额
    let upgradeAmount = PRICE_ALL * 100; // ¥250 in fen
    const { data: previousPaid } = await admin
      .from("purchases")
      .select("subject_id, amount_cny")
      .eq("user_id", userId)
      .eq("status", "paid");
    if (previousPaid && previousPaid.length > 0) {
      // 同 subject_id 只计一次最大值
      const maxPerSubject: Record<string, number> = {};
      for (const p of previousPaid) {
        if (!p.subject_id) continue;
        maxPerSubject[p.subject_id] = Math.max(maxPerSubject[p.subject_id] || 0, p.amount_cny || 0);
      }
      const totalPaid = Object.values(maxPerSubject).reduce((a, b) => a + b, 0);
      upgradeAmount = Math.max(100, PRICE_ALL * 100 - totalPaid); // 最低 ¥1
    }

    const tradeNo = generateTradeNo();
    const { error } = await admin.from("purchases").insert({
      user_id: userId,
      subject_id: null,
      amount_cny: upgradeAmount,
      alipay_trade_no: tradeNo,
      status: "pending",
    });
    if (error) {
      console.error("All plan insert error:", error);
      return NextResponse.json({ error: "创建订单失败" }, { status: 500 });
    }
    let url: string;
    const amountYuan = (upgradeAmount / 100).toFixed(2);
    const returnUrl = `${new URL(request.url).origin}/api/payment/return`;
    try {
      url = createPagePayUrl({
        outTradeNo: tradeNo,
        totalAmount: amountYuan,
        subject: "IGCSE All Subjects - 12 Months Access",
        body: "CAIE + Edexcel all subjects",
        returnUrl,
      });
    } catch (e: any) {
      console.error("Alipay form error:", e.message, e.stack);
      return NextResponse.json({ error: "支付宝配置错误: " + e.message }, { status: 500 });
    }
    return NextResponse.json({ url });
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

  let url: string;
  const returnUrl = `${new URL(request.url).origin}/api/payment/return`;
  try {
    url = createPagePayUrl({
      outTradeNo: tradeNo,
      totalAmount: String(PRICE_PER_SUBJECT) + ".00",
      subject: `IGCSE ${subject.display_name}`,
      body: `IGCSE ${subject.display_name} 科目复习资料`,
      returnUrl,
    });
  } catch (e: any) {
    console.error("Alipay form error:", e.message, e.stack);
    return NextResponse.json({ error: "支付宝配置错误: " + e.message }, { status: 500 });
  }

    return NextResponse.json({ url });
}
// deploy trigger 1779554954
