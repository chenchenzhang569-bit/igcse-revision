import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";
import type { NextRequest } from "next/server";

// POST /api/errors/report — 公开接口，任何人可调用
export async function POST(request: NextRequest) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { message, stack, url, userAgent } = body;
  if (!message) {
    return NextResponse.json({ error: "缺少错误信息" }, { status: 400 });
  }

  const admin = createAdminClient();

  // 尝试获取当前用户
  let userId: string | null = null;
  let userEmail: string | null = null;
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return request.cookies.getAll(); }, setAll() {} } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      userId = user.id;
      userEmail = user.email || null;
    }
  } catch {
    // 未登录不影响上报
  }

  const { error } = await admin.from("error_reports").insert({
    user_id: userId,
    user_email: userEmail,
    url: url || null,
    message,
    stack: stack || null,
    user_agent: userAgent || null,
  });

  if (error) {
    console.error("Error report insert failed:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
