import { NextRequest, NextResponse } from "next/server";

// Store last payload in supabase
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  let parsed: any = null;
  try { parsed = JSON.parse(rawBody); } catch {}

  // Try to store in Supabase for later retrieval
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (supabaseUrl && supabaseKey) {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
      await supabase.from("app_config").upsert({
        key: "LAST_HOOK_PAYLOAD",
        value: rawBody.substring(0, 5000),
        updated_at: new Date().toISOString(),
      });
    }
  } catch (e) {
    // silent fail
  }

  // Return full info for any immediate inspection
  const info = {
    method: "POST",
    length: rawBody.length,
    parsed: parsed ? {
      topKeys: Object.keys(parsed),
      hasEmail: !!parsed?.email,
      emailKeys: parsed?.email ? Object.keys(parsed.email) : [],
      hasUser: !!parsed?.user,
      userKeys: parsed?.user ? Object.keys(parsed.user) : [],
      emailSample: JSON.stringify(parsed?.email).substring(0, 500),
    } : "Not JSON",
    rawSample: rawBody.substring(0, 500),
  };
  
  return NextResponse.json(info);
}

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "No DB config" });
  }
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
  const { data } = await supabase.from("app_config").select("*").eq("key", "LAST_HOOK_PAYLOAD").maybeSingle();
  return NextResponse.json(data || { message: "No data yet" });
}
