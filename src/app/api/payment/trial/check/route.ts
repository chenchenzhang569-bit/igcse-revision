import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";

// GET /api/payment/trial/check
export async function GET(request: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll() {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ hasTrial: false, trial: null });

  const { data } = await supabase
    .from("purchases")
    .select("id, subject_id, expires_at, status")
    .eq("user_id", user.id)
    .eq("status", "trial")
    .maybeSingle();

  if (!data) return NextResponse.json({ hasTrial: false, trial: null });

  const now = new Date();
  const active = new Date(data.expires_at) > now;

  return NextResponse.json({
    hasTrial: true,
    trial: {
      id: data.id,
      subjectId: data.subject_id,
      expiresAt: data.expires_at,
      active,
    },
  });
}
