import { createClient } from "@/lib/supabase/server";

export async function requireAdmin(): Promise<Response | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}
