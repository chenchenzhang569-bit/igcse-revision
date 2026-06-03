import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// POST /api/activity/log — log a user action (view, download, etc.)
// Fire-and-forget from client side
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient(
      "https://aondldqwwvttwpervrfq.supabase.co",
      process.env.SUPABASE_SERVICE_ROLE_KEY || ""
    );

    const { data: { user } } = await supabase.auth.getUser(authHeader.slice(7));
    if (!user) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const { activity_type, detail, subject_id, page_url } = await req.json();

    await supabase.from("activity_logs").insert({
      user_id: user.id,
      subject_id: subject_id || null,
      activity_type: String(activity_type || "").slice(0, 50),
      detail: String(detail || "").slice(0, 255),
      page_url: String(page_url || "").slice(0, 500),
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true }); // always succeed silently
  }
}
