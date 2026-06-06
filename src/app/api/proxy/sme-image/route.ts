import { NextRequest, NextResponse } from "next/server";
import { getR2PresignedUrl } from "@/lib/r2";

/**
 * 代理 sme-images：将 Supabase Storage URL 转为 R2 presigned URL 并重定向。
 * 用法：/api/proxy/sme-image?url=<encoded-supabase-url>
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  const decoded = decodeURIComponent(url);

  // 只代理 sme-images 桶的请求
  if (!decoded.includes("sme-images")) {
    return NextResponse.json({ error: "Invalid bucket" }, { status: 400 });
  }

  const r2Url = await getR2PresignedUrl(decoded);
  if (!r2Url) {
    return NextResponse.json({ error: "Failed to generate presigned URL" }, { status: 500 });
  }

  return NextResponse.redirect(r2Url, 302);
}
