import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const API = "https://aondldqwwvttwpervrfq.supabase.co/rest/v1";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const HEADERS = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

function getFingerprint(ip: string, ua: string): string {
  // Simple hash of IP + browser
  return `${ip}|${ua?.slice(0, 50) || ""}`;
}

function getJwt(req: NextRequest): string | null {
  const ah = req.headers.get("authorization") || "";
  if (ah.startsWith("Bearer ")) return ah.slice(7);
  const cookie = req.headers.get("cookie") || "";
  const match = cookie.match(/sb-[^;]+-auth-token=([^;]+)/);
  if (!match) return null;
  try {
    const token = JSON.parse(decodeURIComponent(match[1]));
    return (Array.isArray(token) ? token[0]?.access_token : token?.access_token) || null;
  } catch { return null; }
}

function getUserId(jwt: string): string | null {
  try {
    return JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString()).sub || null;
  } catch { return null; }
}

export async function POST(req: NextRequest) {
  try {
    const jwt = getJwt(req);
    if (!jwt) return NextResponse.json({ ok: true });

    const userId = getUserId(jwt);
    if (!userId) return NextResponse.json({ ok: true });

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
    const ua = req.headers.get("user-agent") || "";
    const fp = getFingerprint(ip, ua);

    // 1. Check if banned
    const { body: banBody } = await fetch(
      `${API}/user_bans?user_id=eq.${userId}&banned_until=gt.now()&limit=1`,
      { headers: { ...HEADERS, Prefer: "count=exact" } }
    );
    const bans = await banBody ? (banBody as any).json?.() : null;
    if (Array.isArray(bans) && bans.length > 0) {
      return NextResponse.json({ banned: true, reason: bans[0].reason }, { status: 403 });
    }

    // 2. Check IP switching in last 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { body: logBody } = await fetch(
      `${API}/user_security_log?select=ip_address,fingerprint&user_id=eq.${userId}&created_at=gte.${oneHourAgo}&order=created_at.desc&limit=20`,
      { headers: { ...HEADERS, range: "0-19" } }
    );
    const logs = await logBody ? (logBody as any).json?.() : [];
    if (Array.isArray(logs)) {
      const uniqueIPs = new Set(logs.filter((l: any) => l.ip_address).map((l: any) => l.ip_address));
      // Add current IP
      uniqueIPs.add(ip);

      if (uniqueIPs.size >= 3) {
        // Check how many warnings this user already has
        const { body: warnBody } = await fetch(
          `${API}/user_security_log?select=id&user_id=eq.${userId}&event_type=in.(warning,banned)&limit=1`,
          { headers: { ...HEADERS, Prefer: "count=exact" } }
        );
        const warnCount = Array.isArray(await warnBody ? (warnBody as any).json?.() : [])
          ? (await (warnBody as any).json()).length
          : 0;

        if (warnCount >= 1) {
          // 2nd offense → BAN
          await fetch(`${API}/user_bans`, {
            method: "POST",
            headers: HEADERS,
            body: JSON.stringify({
              user_id: userId,
              banned_until: new Date(Date.now() + 100 * 365 * 86400000).toISOString(), // ~100 years
              reason: "Account sharing — multiple devices/IPs detected",
            }),
          });
          await fetch(`${API}/user_security_log`, {
            method: "POST",
            headers: HEADERS,
            body: JSON.stringify({
              user_id: userId, event_type: "banned",
              ip_address: ip, fingerprint: fp,
              detail: `Auto-banned: ${uniqueIPs.size} IPs in 10 min`,
            }),
          });
          return NextResponse.json({ banned: true, reason: "Account disabled for sharing" }, { status: 403 });
        } else {
          // 1st offense → WARN
          await fetch(`${API}/user_security_log`, {
            method: "POST",
            headers: HEADERS,
            body: JSON.stringify({
              user_id: userId, event_type: "warning",
              ip_address: ip, fingerprint: fp,
              detail: `${uniqueIPs.size} different IPs detected in 10 minutes`,
            }),
          });
          return NextResponse.json({
            warning: true,
            message: "⚠️ 检测到账号在多设备/多地登录。请勿共享账号，再次检测将永久禁用。",
          });
        }
      }
    }

    // 3. Log this check (for future IP switching detection)
    await fetch(`${API}/user_security_log`, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({
        user_id: userId, event_type: "activity",
        ip_address: ip, fingerprint: fp,
        detail: "Check-in",
      }),
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("Security check error:", e.message);
    return NextResponse.json({ ok: true }); // Fail open
  }
}
