import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { NextRequest } from "next/server";

function parseJwt(token: string) {
  try {
    const base64 = token.split(".")[1];
    return JSON.parse(Buffer.from(base64, "base64").toString());
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ isAdmin: false }, { status: 401 });
  }

  const token = authHeader.slice(7);
  const payload = parseJwt(token);
  const userId = payload?.sub;

  if (!userId) {
    return NextResponse.json({ isAdmin: false }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  return NextResponse.json({ isAdmin: data?.role === "admin" });
}
