import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyNotify } from "@/lib/alipay";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  let body: string;
  try {
    body = await request.text();
  } catch {
    return new NextResponse("error", { status: 400 });
  }

  // 解析 x-www-form-urlencoded
  const params: Record<string, string> = {};
  for (const [k, v] of new URLSearchParams(body)) {
    params[k] = v;
  }

  // 验签
  const isValid = verifyNotify({ ...params });
  if (!isValid) {
    return new NextResponse("fail", { status: 400 });
  }

  const tradeNo = params.out_trade_no;
  const tradeStatus = params.trade_status;

  if (!tradeNo || !tradeStatus) {
    return new NextResponse("fail", { status: 400 });
  }

  // 更新订单状态
  const supabase = createAdminClient();

  if (tradeStatus === "TRADE_SUCCESS" || tradeStatus === "TRADE_FINISHED") {
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    await supabase
      .from("purchases")
      .update({
        status: "paid",
        paid_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      .eq("alipay_trade_no", tradeNo)
      .eq("status", "pending");
  }

  return new NextResponse("success");
}
