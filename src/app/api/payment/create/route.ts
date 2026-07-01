import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";
import { createOrder, generateTradeNo } from "@/lib/yipay";
import type { NextRequest } from "next/server";

const PRICE_PER_SUBJECT = 1;   // ¥1 测试价
const PRICE_ALL = 250;         // ¥250 全科

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

  if (!userId) return NextResponse.json({ error: "Please log in first" }, { status: 401 });

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY 未配置" }, { status: 500 });

  const body = await request.json();
  const { subjectId, plan, type } = body;

  // Admin client for DB writes (bypasses RLS)
  const admin = createAdminClient();

  // 获取客户端 IP
  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "127.0.0.1";

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
  const notifyUrl = `${siteUrl}/api/payment/notify`;
  const returnUrl = `${siteUrl}/api/payment/return`;

  if (plan === "all") {
    // 检查是否已购全科（防止重复下单）
    const { data: existingAll } = await admin
      .from("purchases")
      .select("id, expires_at")
      .eq("user_id", userId)
      .is("subject_id", null)
      .eq("status", "paid")
      .maybeSingle();
    if (existingAll) {
      return NextResponse.json({ error: `You already have full access — valid until ${new Date(existingAll.expires_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}` }, { status: 409 });
    }

    // 计算升级差价：已付单科总额
    let upgradeFen = PRICE_ALL * 100; // ¥250 in fen
    const { data: previousPaid } = await admin
      .from("purchases")
      .select("subject_id, amount_cny")
      .eq("user_id", userId)
      .eq("status", "paid");
    if (previousPaid && previousPaid.length > 0) {
      const maxPerSubject: Record<string, number> = {};
      for (const p of previousPaid) {
        if (!p.subject_id) continue;
        maxPerSubject[p.subject_id] = Math.max(maxPerSubject[p.subject_id] || 0, p.amount_cny || 0);
      }
      const totalPaid = Object.values(maxPerSubject).reduce((a, b) => a + b, 0);
      upgradeFen = Math.max(100, PRICE_ALL * 100 - totalPaid);
    }

    const tradeNo = generateTradeNo();
    const { error } = await admin.from("purchases").insert({
      user_id: userId,
      subject_id: null,
      amount_cny: upgradeFen,
      alipay_trade_no: tradeNo,
      status: "pending",
    });
    if (error) {
      console.error("All plan insert error:", error);
      return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
    }

    const amountYuan = (upgradeFen / 100).toFixed(2);
    try {
      const result = await createOrder({
        outTradeNo: tradeNo,
        type,
        name: "IGCSE All Subjects - 12 Months Access",
        money: amountYuan,
        notifyUrl,
        returnUrl,
        clientIp,
        device: "mobile",
        param: JSON.stringify({ userId, plan: "all" }),
      });
      if (result.code !== 1) {
        console.error("yipay create order error:", result);
        return NextResponse.json({ error: "支付创建失败: " + (result.msg || "未知错误") }, { status: 500 });
      }
      // 返回跳转URL（优先payurl，其次qrcode）
      const payUrl = result.payurl || result.qrcode || "";
      if (!payUrl) {
        return NextResponse.json({ error: "支付系统未返回支付链接" }, { status: 500 });
      }
      return NextResponse.json({ url: payUrl });
    } catch (e: any) {
      console.error("yipay order error:", e.message, e.stack);
      return NextResponse.json({ error: "支付配置错误: " + e.message }, { status: 500 });
    }
  }

  if (!subjectId) return NextResponse.json({ error: "缺少科目ID" }, { status: 400 });

  // Lookup subject
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

  const amountYuan = String(PRICE_PER_SUBJECT) + ".00";
  try {
    const result = await createOrder({
        outTradeNo: tradeNo,
        type,
        name: `IGCSE ${subject.display_name}`,
        money: amountYuan,
        notifyUrl,
        returnUrl,
        clientIp,
        device: "pc",
        param: JSON.stringify({ userId, subjectId, plan: "single" }),
      });
    if (result.code !== 1) {
      console.error("yipay create order error:", result);
      return NextResponse.json({ error: "支付创建失败: " + (result.msg || "未知错误") }, { status: 500 });
    }
    const payUrl = result.payurl || result.qrcode || "";
    if (!payUrl) {
      return NextResponse.json({ error: "支付系统未返回支付链接" }, { status: 500 });
    }
    return NextResponse.json({ url: payUrl });
  } catch (e: any) {
    console.error("yipay order error:", e.message, e.stack);
    return NextResponse.json({ error: "支付配置错误: " + e.message }, { status: 500 });
  }
}
// deploy trigger 1779554954
