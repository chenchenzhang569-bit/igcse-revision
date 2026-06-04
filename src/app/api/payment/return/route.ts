import { NextResponse } from "next/server";
import { queryTrade, verifyNotify } from "@/lib/alipay";
import type { NextRequest } from "next/server";

const API = "https://aondldqwwvttwpervrfq.supabase.co/rest/v1";

function getSrHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return { apikey: key, Authorization: `Bearer ${key}` };
}

async function markPaid(tradeNo: string) {
  try {
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    await fetch(
      `${API}/purchases?alipay_trade_no=eq.${encodeURIComponent(tradeNo)}&status=eq.pending`,
      {
        method: "PATCH",
        headers: { ...getSrHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "paid",
          paid_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
        }),
      }
    );
    return true;
  } catch (e) {
    console.error("Return route DB update failed:", e);
    return false;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;

  const params: Record<string, string> = {};
  searchParams.forEach((v, k) => (params[k] = v));

  const tradeNo = params.out_trade_no;
  if (!tradeNo) {
    return NextResponse.redirect(new URL("/dashboard?payment=error", siteUrl));
  }

  const gateway = process.env.ALIPAY_GATEWAY || "";
  const isSandbox = !gateway || gateway.includes("sandbox");

  if (isSandbox) {
    // 沙箱环境：queryTrade 不支持，且 page pay 同步返回可能不带 trade_status
    // 只要能拿回 out_trade_no 就标记 paid
    await markPaid(tradeNo);
    return NextResponse.redirect(new URL("/dashboard?payment=success", siteUrl));
  }

  // 生产环境：queryTrade API 验证
  const status = await queryTrade(tradeNo);
  if (status === "TRADE_SUCCESS" || status === "TRADE_FINISHED") {
    await markPaid(tradeNo);
    return NextResponse.redirect(new URL("/dashboard?payment=success", siteUrl));
  }

  // 生产 fallback：验签
  const tradeStatus = params.trade_status;
  if ((tradeStatus === "TRADE_SUCCESS" || tradeStatus === "TRADE_FINISHED") && verifyNotify({ ...params })) {
    await markPaid(tradeNo);
    return NextResponse.redirect(new URL("/dashboard?payment=success", siteUrl));
  }

  return NextResponse.redirect(new URL("/dashboard?payment=cancelled", siteUrl));
}
