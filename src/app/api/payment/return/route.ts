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

  const params: Record<string, string> = {};
  searchParams.forEach((v, k) => (params[k] = v));

  const tradeNo = params.out_trade_no;
  if (!tradeNo) {
    return NextResponse.redirect(new URL("/dashboard?payment=error", request.url));
  }

  // 1. 尝试 queryTrade（生产环境可靠）
  const status = await queryTrade(tradeNo);
  if (status === "TRADE_SUCCESS" || status === "TRADE_FINISHED") {
    await markPaid(tradeNo);
    return NextResponse.redirect(new URL("/dashboard?payment=success", request.url));
  }

  // 2. 沙箱 fallback：验签 + 信任 return URL 的 trade_status
  const tradeStatus = params.trade_status;
  if ((tradeStatus === "TRADE_SUCCESS" || tradeStatus === "TRADE_FINISHED") && verifyNotify({ ...params })) {
    await markPaid(tradeNo);
    return NextResponse.redirect(new URL("/dashboard?payment=success", request.url));
  }

  return NextResponse.redirect(new URL("/dashboard?payment=cancelled", request.url));
}
