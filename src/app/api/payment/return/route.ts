import { NextResponse } from "next/server";
import { verifyNotify } from "@/lib/alipay";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const params: Record<string, string> = {};
  searchParams.forEach((v, k) => (params[k] = v));

  const tradeStatus = params.trade_status;

  // 沙箱环境不可靠，不做自动标记 paid
  // paid 状态仅由 notify_url 回调或管理后台手动确认
  if (tradeStatus === "TRADE_SUCCESS" || tradeStatus === "TRADE_FINISHED") {
    return NextResponse.redirect(new URL("/dashboard?payment=success", request.url));
  }

  return NextResponse.redirect(new URL("/dashboard?payment=cancelled", request.url));
}
