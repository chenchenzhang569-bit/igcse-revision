import { NextResponse } from "next/server";
import { queryTrade } from "@/lib/alipay";
import type { NextRequest } from "next/server";

const API = "https://aondldqwwvttwpervrfq.supabase.co/rest/v1";

function getSrHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return { apikey: key, Authorization: `Bearer ${key}` };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const params: Record<string, string> = {};
  searchParams.forEach((v, k) => (params[k] = v));

  const tradeNo = params.out_trade_no;

  if (!tradeNo) {
    return NextResponse.redirect(new URL("/dashboard?payment=error", request.url));
  }

  // 调用支付宝 API 查询真实支付状态
  const status = await queryTrade(tradeNo);

  if (status === "TRADE_SUCCESS" || status === "TRADE_FINISHED") {
    // 确认支付成功 → 标记 paid
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
    } catch (e) {
      console.error("Return route DB update failed:", e);
    }

    return NextResponse.redirect(new URL("/dashboard?payment=success", request.url));
  }

  return NextResponse.redirect(new URL("/dashboard?payment=cancelled", request.url));
}
