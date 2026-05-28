import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const API = "https://aondldqwwvttwpervrfq.supabase.co/rest/v1";

function getSrHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return { apikey: key, Authorization: `Bearer ${key}` };
}

function parseJwt(token: string) {
  try {
    const base64 = token.split(".")[1];
    let decoded: string;
    if (typeof Buffer !== "undefined") {
      decoded = Buffer.from(base64, "base64").toString();
    } else {
      const std = base64.replace(/-/g, "+").replace(/_/g, "/");
      decoded = atob(std);
    }
    return JSON.parse(decoded);
  } catch { return null; }
}

export async function GET(request: NextRequest) {
  // Try Authorization: Bearer *** first
  const authHeader = request.headers.get("authorization");
  let userId: string | null = null;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const payload = parseJwt(token);
    userId = payload?.sub || null;
  }
  // Fallback: cookie-based auth
  if (!userId) {
    const cookieHeader = request.headers.get("cookie") || "";
    const match = cookieHeader.match(/sb-[^;]+-auth-token=([^;]+)/);
    if (match) {
      try {
        const decoded = decodeURIComponent(match[1]);
        const parsed = JSON.parse(decoded);
        const token = Array.isArray(parsed) ? parsed[0]?.access_token : parsed?.access_token;
        if (token) {
          const payload = parseJwt(token);
          userId = payload?.sub || null;
        }
      } catch {}
    }
  }

  if (!userId) return NextResponse.json({ purchases: [], upgradePrice: 25000 }, { status: 200 });

  // Query purchases directly (service role bypasses RLS)
  const res = await fetch(
    `${API}/purchases?select=id,subject_id,amount_cny,status,expires_at&user_id=eq.${userId}&status=in.(paid,trial)&order=expires_at.desc`,
    { headers: getSrHeaders() }
  );
  const purchases = await res.json();

  if (!Array.isArray(purchases) || purchases.length === 0) {
    return NextResponse.json({ purchases: [], upgradePrice: 25000 });
  }

  const now = new Date();
  const allSubjectIds = purchases.filter((p: any) => p.subject_id).map((p: any) => p.subject_id);
  const hasAllSubjectPlan = purchases.some((p: any) => !p.subject_id);

  // Get subject names + boards + slugs
  let subjectMap: Record<string, { name: string; code: string; slug: string; board: string }> = {};
  if (allSubjectIds.length > 0) {
    const [subRes, boardRes] = await Promise.all([
      fetch(`${API}/subjects?select=id,display_name,code,slug,exam_board_id&id=in.(${allSubjectIds.join(",")})`, { headers: getSrHeaders() }),
      fetch(`${API}/exam_boards?select=id,name`, { headers: getSrHeaders() }),
    ]);
    const subjects = await subRes.json();
    const boards = await boardRes.json();
    const boardMap: Record<string, string> = {};
    if (Array.isArray(boards)) for (const b of boards) boardMap[b.id] = b.name;
    if (Array.isArray(subjects)) {
      for (const s of subjects) {
        subjectMap[s.id] = {
          name: s.display_name || s.code,
          code: s.code || "",
          slug: s.slug || "",
          board: boardMap[s.exam_board_id] || "",
        };
      }
    }
  }

  // All-subject plan: expand to all published subjects
  if (hasAllSubjectPlan) {
    const allPlanPurchase = purchases.find((p: any) => !p.subject_id);
    const resAll = await fetch(
      `${API}/subjects?select=id,display_name,code,slug,exam_board_id&is_published=eq.true`,
      { headers: getSrHeaders() }
    );
    const allSubjects = await resAll.json();
    if (Array.isArray(allSubjects) && allPlanPurchase) {
      for (const s of allSubjects) {
        if (subjectMap[s.id]) continue;
        subjectMap[s.id] = { name: s.display_name || s.code, code: s.code || "", slug: s.slug || "", board: "" };
        purchases.push({
          id: allPlanPurchase.id, subject_id: s.id,
          amount_cny: allPlanPurchase.amount_cny, status: allPlanPurchase.status,
          expires_at: allPlanPurchase.expires_at,
        });
      }
    }
    // Remove the null-subject-id "all" placeholder
    const filtered = purchases.filter((p: any) => p.subject_id);
    purchases.length = 0;
    purchases.push(...filtered);
  }

  // Build response
  const result = purchases.map((p: any) => {
    const sub = p.subject_id ? subjectMap[p.subject_id] : null;
    const expiresAt = p.expires_at ? new Date(p.expires_at) : null;
    const daysLeft = expiresAt
      ? Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : null;
    return {
      purchase_id: p.id,
      subject_id: p.subject_id,
      subject_name: sub?.name || "Unknown",
      subject_code: sub?.code || "",
      subject_slug: sub?.slug || "",
      board: sub?.board || "",
      status: p.status,
      expires_at: p.expires_at,
      days_left: daysLeft,
      expired: expiresAt ? expiresAt <= now : false,
    };
  });

  // Calculate upgrade price
  const perSubjectMax: Record<string, number> = {};
  for (const p of purchases) {
    if (p.status !== "paid" || !p.subject_id) continue;
    const max = perSubjectMax[p.subject_id] || 0;
    perSubjectMax[p.subject_id] = Math.max(max, p.amount_cny || 0);
  }
  const totalPaid = Object.values(perSubjectMax).reduce((a, b) => a + b, 0);
  const upgradePrice = Math.max(100, 25000 - totalPaid);

  return NextResponse.json({ purchases: result, upgradePrice, totalPaid, hasAllSubject: hasAllSubjectPlan });
}
