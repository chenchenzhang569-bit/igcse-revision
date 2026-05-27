import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const supabase = createClient(
      "https://aondldqwwvttwpervrfq.supabase.co",
      process.env.SUPABASE_SERVICE_ROLE_KEY || ""
    );

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "https://igcse-revision-cdgy.vercel.app"}/auth/callback?next=/dashboard`,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ message: "Reset link sent. Check your email." });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
