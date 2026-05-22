import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    // 手动设置 Supabase auth cookie（middleware 会读取它）
    const projectRef = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split(".")[0];
    const cookieStore = await cookies();

    const cookieValue = JSON.stringify([
      data.session.access_token,
      data.session.refresh_token,
      data.session.expires_at,
    ]);
    // @supabase/ssr 期望 base64url 编码 + "base64-" 前缀
    const encoded = "base64-" + Buffer.from(cookieValue).toString("base64url");

    cookieStore.set(
      `sb-${projectRef}-auth-token`,
      encoded,
      {
        path: "/",
        sameSite: "lax",
        maxAge: 400 * 24 * 60 * 60,
      }
    );

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
