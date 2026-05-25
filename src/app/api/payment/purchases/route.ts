import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return request.cookies.getAll(); }, setAll() {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ purchases: [], upgradePrice: 25000 }, { status: 200 });

  const admin = createAdminClient();

  // 查所有 paid/trial 订单
  const { data: purchases, error } = await admin
    .from("purchases")
    .select("id, subject_id, amount_cny, status, expires_at")
    .eq("user_id", user.id)
    .in("status", ["paid", "trial"]);

  if (error) {
    console.error("Purchases fetch error:", error);
    return NextResponse.json({ purchases: [], upgradePrice: 25000 }, { status: 200 });
  }

  if (!purchases || purchases.length === 0) {
    return NextResponse.json({ purchases: [], upgradePrice: 25000 });
  }

  const now = new Date();
  const allSubjectIds = purchases
    .filter(p => p.subject_id)
    .map(p => p.subject_id);
  const hasAllSubjectPlan = purchases.some(p => !p.subject_id);

  // 查 subjects 名字 + 考试局
  let subjectMap: Record<string, { name: string; code: string; board: string }> = {};
  if (allSubjectIds.length > 0) {
    const { data: subjects } = await admin
      .from("subjects")
      .select("id, display_name, code, exam_board_id")
      .in("id", allSubjectIds);

    // 查考试局
    const { data: boards } = await admin.from("exam_boards").select("id, name");
    const boardMap: Record<string, string> = {};
    if (boards) for (const b of boards) boardMap[b.id] = b.name;

    if (subjects) {
      for (const s of subjects) {
        subjectMap[s.id] = {
          name: s.display_name || s.code,
          code: s.code || "",
          board: boardMap[s.exam_board_id] || "",
        };
      }
    }
  }

  // 如果有全科，补全所有科目
  if (hasAllSubjectPlan) {
    const allPlanPurchase = purchases.find(p => !p.subject_id);
    const { data: allSubjects } = await admin
      .from("subjects")
      .select("id, display_name, code, exam_board_id")
      .eq("is_published", true);

    if (allSubjects && allPlanPurchase) {
      for (const s of allSubjects) {
        // 单科已有的不覆盖（用单科自己的过期时间）
        if (subjectMap[s.id]) continue;
        subjectMap[s.id] = {
          name: s.display_name || s.code,
          code: s.code || "",
          board: boardMap[s.exam_board_id] || "",
        };
        // 虚拟一条全科映射的 purchase
        purchases.push({
          id: allPlanPurchase.id,
          subject_id: s.id,
          amount_cny: allPlanPurchase.amount_cny,
          status: allPlanPurchase.status,
          expires_at: allPlanPurchase.expires_at,
        });
      }
    }
    // 移除原始 subject_id=null 的全科记录，避免重复输出
    const withoutNull = purchases.filter(p => p.subject_id);
    purchases.length = 0;
    purchases.push(...withoutNull);
  }

  // 构建返回
  const result = purchases.map(p => {
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
      board: sub?.board || "",
      status: p.status,
      expires_at: p.expires_at,
      days_left: daysLeft,
      expired: expiresAt ? expiresAt <= now : false,
    };
  });

  // 计算升级全科差价（同 subject_id 只计一次，取最大 amount_cny）
  const perSubjectMax: Record<string, number> = {};
  for (const p of purchases) {
    if (p.status !== "paid" || !p.subject_id) continue;
    const max = perSubjectMax[p.subject_id] || 0;
    perSubjectMax[p.subject_id] = Math.max(max, p.amount_cny || 0);
  }
  const totalPaid = Object.values(perSubjectMax).reduce((a, b) => a + b, 0);
  const ALL_PRICE = 25000; // ¥250 in fen
  const upgradePrice = Math.max(100, ALL_PRICE - totalPaid); // minimum ¥1

  return NextResponse.json({
    purchases: result,
    upgradePrice,
    totalPaid,
    hasAllSubject: hasAllSubjectPlan,
  });
}
