import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createPagePayForm, generateTradeNo } from "@/lib/alipay";
import type { NextRequest } from "next/server";

const PRICE_PER_SUBJECT = 50; // ¥50
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
    // Fallback to cookie-based auth
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
    userId = user?.id || null;
  }

  if (!userId) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const body = await request.json();
  const { subjectId, plan } = body;

  // All-subjects plan
  if (plan === "all") {
    const tradeNo = generateTradeNo();

    // Create single purchase record for "all"
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

    const { error } = await supabase.from("purchases").insert({
      user_id: userId,
      subject_id: null, // null = all subjects
      amount_cny: PRICE_ALL * 100, // store in cents
      alipay_trade_no: tradeNo,
      status: "pending",
    });

    if (error) {
      return NextResponse.json({ error: "创建订单失败" }, { status: 500 });
    }

    const formHtml = createPagePayForm({
      outTradeNo: tradeNo,
      totalAmount: String(PRICE_ALL),
      subject: "IGCSE All Subjects — Lifetime Access",
      body: "CAIE + Edexcel all subjects",
    });

    return new NextResponse(formHtml, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // Single subject
  if (!subjectId) {
    return NextResponse.json({ error: "缺少科目ID" }, { status: 400 });
  }

  // Use anon key for subject lookup (service role not needed)
  const anonClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll() {},
      },
    }
  );

  const { data: subject } = await anonClient
    .from("subjects")
    .select("id, display_name, slug")
    .eq("id", subjectId)
    .maybeSingle();

  if (!subject) {
    return NextResponse.json({ error: "科目不存在" }, { status: 404 });
  }

  // Check already purchased
  const { data: existing } = await anonClient
    .from("purchases")
    .select("id")
    .eq("user_id", userId)
    .eq("subject_id", subjectId)
    .in("status", ["paid", "trial"])
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "您已购买该科目", paid: true }, { status: 409 });
  }

  const tradeNo = generateTradeNo();

  const { error: insertError } = await anonClient.from("purchases").insert({
    user_id: userId,
    subject_id: subjectId,
    amount_cny: PRICE_PER_SUBJECT * 100,
    alipay_trade_no: tradeNo,
    status: "pending",
  });

  if (insertError) {
    return NextResponse.json({ error: "创建订单失败" }, { status: 500 });
  }

  const formHtml = createPagePayForm({
    outTradeNo: tradeNo,
    totalAmount: String(PRICE_PER_SUBJECT),
    subject: `IGCSE ${subject.display_name}`,
    body: `IGCSE ${subject.display_name} 科目复习资料`,
  });

  return new NextResponse(formHtml, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
