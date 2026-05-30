import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { email, password, name, inviteCode } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "邮箱和密码不能为空" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "密码至少需要6个字符" },
        { status: 400 }
      );
    }

    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name: name || "" },
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const response = NextResponse.json({
      user: data.user
        ? { id: data.user.id, email: data.user.email }
        : null,
      message: data.session
        ? "注册成功"
        : "请检查邮箱确认链接",
    });

    // Copy cookies
    cookieStore.getAll().forEach((cookie) => {
      response.cookies.set(cookie.name, cookie.value, {
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
        sameSite: "lax",
        httpOnly: cookie.name.includes("refresh"),
        secure: process.env.NODE_ENV === "production",
      });
    });

    // Process invite code
    if (inviteCode && data.user) {
      const adminClient = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { cookies: { getAll() { return []; }, setAll() {} } }
      );

      // Find inviter by invite code
      const { data: inviter } = await adminClient
        .from("profiles")
        .select("id, invite_count")
        .eq("invite_code", inviteCode)
        .maybeSingle();

      if (inviter) {
        // Link this user to inviter
        await adminClient.from("profiles").update({
          invited_by: inviter.id,
        }).eq("id", data.user.id);

        // Increment inviter's count
        await adminClient.from("profiles").update({
          invite_count: (inviter.invite_count || 0) + 1,
        }).eq("id", inviter.id);
      }
    }

    return response;
  } catch (err) {
    console.error("Signup error:", err);
    return NextResponse.json(
      { error: "服务器内部错误，请稍后再试" },
      { status: 500 }
    );
  }
}
