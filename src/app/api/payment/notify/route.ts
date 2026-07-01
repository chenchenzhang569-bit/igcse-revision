import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifySign } from "@/lib/yipay";
import type { NextRequest } from "next/server";

/**
 * 彩虹易支付异步通知
 * 易支付以 GET 方式请求 notify_url
 * 收到后需返回 "success"
 */
export async function GET(request: NextRequest) {
  const params: Record<string, string> = {};
  const { searchParams } = new URL(request.url);
  searchParams.forEach((v, k) => (params[k] = v));

  // 验签
  if (!verifySign(params)) {
    console.error("yipay notify: invalid sign", params);
    return new NextResponse("fail", { status: 400 });
  }

  const tradeNo = params.out_trade_no;
  const tradeStatus = params.trade_status;

  if (!tradeNo) {
    console.error("yipay notify: missing out_trade_no");
    return new NextResponse("fail", { status: 400 });
  }

  // 只处理支付成功的通知
  if (tradeStatus === "TRADE_SUCCESS") {
    const supabase = createAdminClient();
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    const { error } = await supabase
      .from("purchases")
      .update({
        status: "paid",
        paid_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      .eq("alipay_trade_no", tradeNo)
      .eq("status", "pending");

    if (error) {
      console.error("yipay notify: db update error", error.message);
      return new NextResponse("fail", { status: 500 });
    }
  }

  // 易支付要求返回 "success"
  return new NextResponse("success");
}

// 也支持 POST（某些版本的易支付可能用 POST）
export async function POST(request: NextRequest) {
  // 尝试解析 body（x-www-form-urlencoded 或 JSON）
  let params: Record<string, string> = {};
  try {
    const text = await request.text();
    if (text.startsWith("{")) {
      params = JSON.parse(text);
    } else {
      for (const [k, v] of new URLSearchParams(text)) {
        params[k] = v;
      }
    }
  } catch {
    // 如果解析失败，尝试从 URL 参数获取
    const { searchParams } = new URL(request.url);
    searchParams.forEach((v, k) => (params[k] = v));
  }

  if (!verifySign(params)) {
    console.error("yipay notify POST: invalid sign");
    return new NextResponse("fail", { status: 400 });
  }

  const tradeNo = params.out_trade_no;
  const tradeStatus = params.trade_status;

  if (!tradeNo) {
    return new NextResponse("fail", { status: 400 });
  }

  if (tradeStatus === "TRADE_SUCCESS") {
    const supabase = createAdminClient();
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    const { error } = await supabase
      .from("purchases")
      .update({
        status: "paid",
        paid_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      .eq("alipay_trade_no", tradeNo)
      .eq("status", "pending");

    if (error) {
      console.error("yipay notify POST: db update error", error.message);
      return new NextResponse("fail", { status: 500 });
    }
  }

  return new NextResponse("success");
}
