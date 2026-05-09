import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * 检查用户是否已购买某科目
 */
export async function canAccessSubject(userId: string, subjectId: string): Promise<boolean> {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { data } = await supabase
    .from("purchases")
    .select("id")
    .eq("user_id", userId)
    .eq("subject_id", subjectId)
    .eq("status", "paid")
    .maybeSingle();

  return !!data;
}

/**
 * 获取用户所有已购买科目
 */
export async function getUserSubjects(userId: string) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { data } = await supabase
    .from("purchases")
    .select("subject_id")
    .eq("user_id", userId)
    .eq("status", "paid");

  return data?.map((p) => p.subject_id) || [];
}
