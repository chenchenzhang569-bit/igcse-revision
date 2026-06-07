import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

async function generateShortCode(supabase: any): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const { data: existing } = await supabase
      .from("payment_reviews")
      .select("id")
      .eq("short_code", code)
      .eq("status", "pending")
      .maybeSingle();
    if (!existing) return code;
  }
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() { /* readonly */ },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { subjectId, shortCode } = await req.json();
    if (!subjectId) {
      return NextResponse.json({ error: "Missing subjectId" }, { status: 400 });
    }

    // Check already pending review for this user+subject
    const { data: existing } = await supabase
      .from("payment_reviews")
      .select("id, short_code, status")
      .eq("user_id", user.id)
      .eq("subject_id", subjectId)
      .eq("status", "pending")
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        success: true,
        review: existing,
        shortCode: existing.short_code,
        message: "已有待审核的订单",
      });
    }

    const code = shortCode || await generateShortCode(supabase);

    const { data, error } = await supabase
      .from("payment_reviews")
      .insert({
        user_id: user.id,
        subject_id: subjectId,
        amount_cny: 50,
        status: "pending",
        short_code: code,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, review: data, shortCode: code });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Internal error" }, { status: 500 });
  }
}
