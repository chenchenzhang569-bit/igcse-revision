import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL || "not set",
    sr_key_exists: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    sr_key_prefix: process.env.SUPABASE_SERVICE_ROLE_KEY
      ? process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 20) + "..."
      : "none",
    anon_key_exists: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    anon_key_prefix: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 20) + "..."
      : "none",
    site_url: process.env.NEXT_PUBLIC_SITE_URL || "not set",
  });
}
