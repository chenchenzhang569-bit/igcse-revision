import { NextResponse } from "next/server";
import { verifyNotify } from "@/lib/alipay";
import { createAdminClient } from "@/lib/supabase/admin";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const params: Record<string, string> = {};
  searchParams.forEach((v, k) => (params[k] = v));

  const isValid = verifyNotify({ ...params });

  if (!isValid) {
    return NextResponse.redirect(new URL("/dashboard?payment=error", request.url));
  }

  const tradeStatus = params.trade_status;
  const tradeNo = params.out_trade_no;

  if ((tradeStatus === "TRADE_SUCCESS" || tradeStatus === "TRADE_FINISHED") && tradeNo) {
    // 标记购买为已付（兼容沙箱环境回调不可靠）
    try {
      const admin = createAdminClient();
      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      await admin
        .from("purchases")
        .update({ status: "paid", paid_at: now.toISOString(), expires_at: expiresAt.toISOString() })
        .eq("alipay_trade_no", tradeNo)
        .eq("status", "pending");
    } catch (e) {
      console.error("Return route DB update failed:", e);
    }

    return NextResponse.redirect(new URL("/dashboard?payment=success", request.url));
  }

  return NextResponse.redirect(new URL("/dashboard?payment=cancelled", request.url));
}
