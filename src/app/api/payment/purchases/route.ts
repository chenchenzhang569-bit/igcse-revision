     1|import { NextResponse } from "next/server";
     2|import type { NextRequest } from "next/server";
     3|
     4|const API = "https://aondldqwwvttwpervrfq.supabase.co/rest/v1";
     5|
     6|function getSrHeaders() {
     7|  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
     8|  return { apikey: key, Authorization: `Bearer ${key}` };
     9|}
    10|
    11|function parseJwt(token: string) {
    12|  try {
    13|    const base64 = token.split(".")[1];
    14|    let decoded: string;
    15|    if (typeof Buffer !== "undefined") {
    16|      decoded = Buffer.from(base64, "base64").toString();
    17|    } else {
    18|      const std = base64.replace(/-/g, "+").replace(/_/g, "/");
    19|      decoded = atob(std);
    20|    }
    21|    return JSON.parse(decoded);
    22|  } catch { return null; }
    23|}
    24|
    25|export async function GET(request: NextRequest) {
    26|  // Try Authorization: Bearer *** first
    27|  const authHeader = request.headers.get("authorization");
    28|  let userId: string | null = null;
    29|  if (authHeader?.startsWith("Bearer ")) {
    30|    const token = authHeader.slice(7);
    31|    const payload = parseJwt(token);
    32|    userId = payload?.sub || null;
    33|  }
    34|  // Fallback: cookie-based auth
    35|  if (!userId) {
    36|    const cookieHeader = request.headers.get("cookie") || "";
    37|    const match = cookieHeader.match(/sb-[^;]+-auth-token=([^;]+)/);
    38|    if (match) {
    39|      try {
    40|        const decoded = decodeURIComponent(match[1]);
    41|        const parsed = JSON.parse(decoded);
    42|        const token = Array.isArray(parsed) ? parsed[0]?.access_token : parsed?.access_token;
    43|        if (token) {
    44|          const payload = parseJwt(token);
    45|          userId = payload?.sub || null;
    46|        }
    47|      } catch {}
    48|    }
    49|  }
    50|
    51|  if (!userId) return NextResponse.json({ purchases: [], upgradePrice: 25000 }, { status: 200 });
    52|
    53|  // Query purchases directly (service role bypasses RLS)
    54|  const res = await fetch(
    55|    `${API}/purchases?select=id,subject_id,amount_cny,status,expires_at&user_id=eq.${userId}&status=in.(paid,trial)&order=expires_at.desc`,
    56|    { headers: getSrHeaders() }
    57|  );
    58|  const purchases = await res.json();
    59|
    60|  if (!Array.isArray(purchases) || purchases.length === 0) {
    61|    return NextResponse.json({ purchases: [], upgradePrice: 25000 });
    62|  }
    63|
    64|  const now = new Date();
    65|  const allSubjectIds = purchases.filter((p: any) => p.subject_id).map((p: any) => p.subject_id);
    66|  const hasAllSubjectPlan = purchases.some((p: any) => !p.subject_id);
    67|
    68|  // Get subject names + boards
    69|  let subjectMap: Record<string, { name: string; code: string; board: string }> = {};
    70|  if (allSubjectIds.length > 0) {
    71|    const [subRes, boardRes] = await Promise.all([
    72|      fetch(`${API}/subjects?select=id,display_name,code,slug,exam_board_id&id=in.(${allSubjectIds.join(",")})`, { headers: getSrHeaders() }),
    73|      fetch(`${API}/exam_boards?select=id,name`, { headers: getSrHeaders() }),
    74|    ]);
    75|    const subjects = await subRes.json();
    76|    const boards = await boardRes.json();
    77|    const boardMap: Record<string, string> = {};
    78|    if (Array.isArray(boards)) for (const b of boards) boardMap[b.id] = b.name;
    79|    if (Array.isArray(subjects)) {
    80|      for (const s of subjects) {
    81|        subjectMap[s.id] = {
    82|          name: s.display_name || s.code,
    83|          code: s.code || "",
    84|          board: boardMap[s.exam_board_id] || "",
    85|        };
    86|      }
    87|    }
    88|  }
    89|
    90|  // All-subject plan: expand to all published subjects
    91|  if (hasAllSubjectPlan) {
    92|    const allPlanPurchase = purchases.find((p: any) => !p.subject_id);
    93|    const resAll = await fetch(
    94|      `${API}/subjects?select=id,display_name,code,slug,exam_board_id&is_published=eq.true`,
    95|      { headers: getSrHeaders() }
    96|    );
    97|    const allSubjects = await resAll.json();
    98|    if (Array.isArray(allSubjects) && allPlanPurchase) {
    99|      for (const s of allSubjects) {
   100|        if (subjectMap[s.id]) continue;
   101|        subjectMap[s.id] = { name: s.display_name || s.code, code: s.code || "", slug: s.slug || "", board: "" };
   102|        purchases.push({
   103|          id: allPlanPurchase.id, subject_id: s.id,
   104|          amount_cny: allPlanPurchase.amount_cny, status: allPlanPurchase.status,
   105|          expires_at: allPlanPurchase.expires_at,
   106|        });
   107|      }
   108|    }
   109|    // Remove the null-subject-id "all" placeholder
   110|    const filtered = purchases.filter((p: any) => p.subject_id);
   111|    purchases.length = 0;
   112|    purchases.push(...filtered);
   113|  }
   114|
   115|  // Build response
   116|  const result = purchases.map((p: any) => {
   117|    const sub = p.subject_id ? subjectMap[p.subject_id] : null;
   118|    const expiresAt = p.expires_at ? new Date(p.expires_at) : null;
   119|    const daysLeft = expiresAt
   120|      ? Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
   121|      : null;
   122|    return {
   123|      purchase_id: p.id,
   124|      subject_id: p.subject_id,
   125|      subject_name: sub?.name || "Unknown",
   126|      subject_code: sub?.code || "",
   127|      board: sub?.board || "",
   128|      status: p.status,
   129|      expires_at: p.expires_at,
   130|      days_left: daysLeft,
   131|      expired: expiresAt ? expiresAt <= now : false,
   132|    };
   133|  });
   134|
   135|  // Calculate upgrade price
   136|  const perSubjectMax: Record<string, number> = {};
   137|  for (const p of purchases) {
   138|    if (p.status !== "paid" || !p.subject_id) continue;
   139|    const max = perSubjectMax[p.subject_id] || 0;
   140|    perSubjectMax[p.subject_id] = Math.max(max, p.amount_cny || 0);
   141|  }
   142|  const totalPaid = Object.values(perSubjectMax).reduce((a, b) => a + b, 0);
   143|  const upgradePrice = Math.max(100, 25000 - totalPaid);
   144|
   145|  return NextResponse.json({ purchases: result, upgradePrice, totalPaid, hasAllSubject: hasAllSubjectPlan });
   146|}
   147|