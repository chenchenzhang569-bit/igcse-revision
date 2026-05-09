import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

function getSupabase() {
  const cookieStore = cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(_cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[]) {},
      },
    }
  );
}

// 考试局
export async function getExamBoards() {
  const { data } = await getSupabase().from("exam_boards").select("*").order("created_at");
  return data || [];
}

// 科目列表
export async function getSubjects(boardSlug?: string) {
  let query = getSupabase().from("subjects").select("*, exam_boards!inner(slug, name)").order("sort_order");
  if (boardSlug) {
    query = query.eq("exam_boards.slug", boardSlug);
  }
  const { data } = await query;
  return data || [];
}

// 单个科目
export async function getSubject(slug: string) {
  const { data } = await getSupabase().from("subjects")
    .select("*, exam_boards!inner(slug, name, full_name)")
    .eq("slug", slug)
    .single();
  return data;
}

// 科目下的主题
export async function getTopics(subjectSlug: string) {
  const { data: subject } = await getSupabase().from("subjects").select("id").eq("slug", subjectSlug).single();
  if (!subject) return [];
  const { data } = await getSupabase().from("topics").select("*").eq("subject_id", subject.id).order("sort_order");
  return data || [];
}

// 主题下的笔记
export async function getNotes(topicId: string) {
  const { data } = await getSupabase().from("notes").select("*").eq("topic_id", topicId).order("sort_order");
  return data || [];
}

// 主题下的试题
export async function getQuestions(topicId: string) {
  const { data } = await getSupabase().from("questions").select("*").eq("topic_id", topicId).order("sort_order");
  return data || [];
}

// 科目真题
export async function getPastPapers(subjectSlug: string) {
  const { data: subject } = await getSupabase().from("subjects").select("id").eq("slug", subjectSlug).single();
  if (!subject) return [];
  const { data } = await getSupabase().from("past_papers").select("*").eq("subject_id", subject.id).order("year", { ascending: false });
  return data || [];
}

// 科目模拟卷
export async function getMockExams(subjectSlug: string) {
  const { data: subject } = await getSupabase().from("subjects").select("id").eq("slug", subjectSlug).single();
  if (!subject) return [];
  const { data } = await getSupabase().from("mock_exams").select("*").eq("subject_id", subject.id);
  return data || [];
}
