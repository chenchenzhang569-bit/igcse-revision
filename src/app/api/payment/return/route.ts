import { NextResponse } from "next/server";
import { verifyNotify } from "@/lib/alipay";
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

  if (tradeStatus === "TRADE_SUCCESS" || tradeStatus === "TRADE_FINISHED") {
    const subjectSlug = params.passback_params || "";
    const redirect = subjectSlug
      ? `/subjects/${subjectSlug}?payment=success`
      : "/dashboard?payment=success";
    return NextResponse.redirect(new URL(redirect, request.url));
  }

  return NextResponse.redirect(new URL("/dashboard?payment=cancelled", request.url));
}
