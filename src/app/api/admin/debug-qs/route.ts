import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

function parseJwt(token: string) {
  try {
    const base64 = token.split(".")[1];
    return JSON.parse(Buffer.from(base64, "base64").toString());
  } catch { return null; }
}

async function checkAdmin(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const payload = parseJwt(token);
  if (!payload?.sub) return null;
  const s = createAdminClient();
  const { data } = await s.from("user_roles").select("role").eq("user_id", payload.sub).maybeSingle();
  return data?.role === "admin" ? s : null;
}

export async function GET(request: NextRequest) {
  const s = await checkAdmin(request);
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const filterSubjectId = searchParams.get("subject_id") || "";
  const filterType = searchParams.get("type") || "all";

  // -- Count questions with different type filters --
  let q = s.from("questions");
  if (filterSubjectId) q = q.eq("subject_id", filterSubjectId);
  if (filterType === "mcq") q = q.eq("question_type", "mcq");
  if (filterType === "questions") q = q.neq("question_type", "mcq");
  const { count: questionsCount } = await q.select("*", { count: "exact", head: true });

  // -- Count mock questions --
  let mockQ = s.from("mock_exam_questions");
  if (filterSubjectId) {
    const mt = (d: string, c: string) => { const l = d.toLowerCase(); if (l.includes("biology")) return "biology"; if (l.includes("chemistry")) return "chemistry"; if (l.includes("physics")) return "physics"; if (l.includes("mathematics")) return "maths"; if (l.includes("computer")) return "computer-science"; if (l.includes("additional")) return c||"0606"; if (l.includes("economics")) return "economics"; return l; };
    const { data: subs } = await s.from("subjects").select("id, display_name, code");
    const t2s: Record<string,string> = {};
    if (subs) for (const sub of subs) { const k = mt(sub.display_name, sub.code||""); if (!(k in t2s)) t2s[k] = sub.id; }
    const { data: sets } = await s.from("mock_exam_sets").select("id, subject");
    const set2subj: Record<string,string> = {};
    if (sets) for (const st of sets) { const sid = t2s[st.subject]; if (sid) set2subj[st.id] = sid; }
    const { data: papers } = await s.from("mock_exam_papers").select("id, set_id");
    const pp2subj: Record<string,string> = {};
    if (papers) for (const p of papers) { const sid = set2subj[p.set_id]; if (sid) pp2subj[p.id] = sid; }
    const pids = Object.entries(pp2subj).filter(([,sid]) => sid === filterSubjectId).map(([pid]) => pid);
    if (pids.length) mockQ = mockQ.in("paper_id", pids);
  }
  const { count: mockCount } = await mockQ.select("*", { count: "exact", head: true });

  return NextResponse.json({
    debug: { type: filterType, subject_id: filterSubjectId },
    questions_count: questionsCount || 0,
    mock_count: mockCount || 0,
    total: (questionsCount || 0) + (mockCount || 0),
  });
}
