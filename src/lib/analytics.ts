/**
 * 站内分析系统
 * 数据存储在 Supabase app_config 表（key-value）
 * 聚合写入，不存原始事件
 */

export interface AnalyticsData {
  total_pv: number;
  total_visitors: number;
  daily: Record<string, DayStats>;
  devices: Record<string, number>;
  browsers: Record<string, number>;
  os: Record<string, number>;
  pages: Record<string, number>;
  sources: Record<string, number>;
}

export interface DayStats {
  pv: number;
  visitors: number;
  bounces: number;
  sessions: number;
  total_time: number; // seconds
}

export interface TrackEvent {
  session_id: string;
  page_url: string;
  referrer: string;
  user_agent?: string;
  device_type?: string;
  browser?: string;
  os?: string;
  screen_width: number;
  screen_height: number;
  language?: string;
  event_type: "pageview" | "heartbeat" | "leave";
}

const ANALYTICS_KEY = "analytics_v2";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

async function getAdminClient() {
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(
    SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function getAnalyticsData(): Promise<AnalyticsData | null> {
  const admin = await getAdminClient();
  const { data } = await admin
    .from("app_config")
    .select("value")
    .eq("key", ANALYTICS_KEY)
    .maybeSingle();
  if (!data?.value) return null;
  return typeof data.value === "string"
    ? JSON.parse(data.value)
    : data.value;
}

export async function saveAnalyticsData(data: AnalyticsData): Promise<void> {
  const admin = await getAdminClient();
  const now = new Date().toISOString();
  const { error } = await admin.from("app_config").upsert(
    { key: ANALYTICS_KEY, value: JSON.stringify(data), updated_at: now },
    { onConflict: "key" }
  );
  if (error) console.error("analytics save error:", error);
}

function parseDeviceType(ua: string, w: number): string {
  if (/mobile|android.*mobile|iphone|ipod/i.test(ua)) return "mobile";
  if (/ipad|tablet|android(?!.*mobile)/i.test(ua)) return "tablet";
  if (/windows|macintosh|linux/i.test(ua) && w > 800) return "desktop";
  if (w <= 768) return "mobile";
  if (w <= 1024) return "tablet";
  return "desktop";
}

function parseBrowser(ua: string): string {
  if (/micromessenger/i.test(ua)) return "wechat";
  if (/qq\//i.test(ua) || /qqbrowser/i.test(ua)) return "qq";
  if (/edg/i.test(ua) || /edge/i.test(ua)) return "edge";
  if (/chrome/i.test(ua) && !/edg/i.test(ua)) return "chrome";
  if (/safari/i.test(ua) && !/chrome/i.test(ua)) return "safari";
  if (/firefox/i.test(ua)) return "firefox";
  return "other";
}

function parseOS(ua: string): string {
  if (/windows/i.test(ua)) return "windows";
  if (/macintosh|mac os/i.test(ua) && !/iphone|ipad/i.test(ua)) return "macos";
  if (/iphone/i.test(ua) || /ipad/i.test(ua)) return "ios";
  if (/android/i.test(ua)) return "android";
  if (/linux/i.test(ua)) return "linux";
  return "other";
}

function parseSource(referrer: string): string {
  if (!referrer) return "direct";
  try {
    const url = new URL(referrer);
    const host = url.hostname;
    if (host.includes("google")) return "google";
    if (host.includes("baidu")) return "baidu";
    if (host.includes("bing")) return "bing";
    if (host.includes("weixin") || host.includes("wechat")) return "wechat";
    if (host.includes("zhihu")) return "zhihu";
    if (host.includes("xiaohongshu")) return "xiaohongshu";
    if (host.includes("douyin")) return "douyin";
    if (host.includes("bilibili") || host.includes("b23")) return "bilibili";
    if (host.includes("qq")) return "qq";
    if (host.includes("so.com") || host.includes("360")) return "360";
    if (host.includes("sogou")) return "sogou";
    return host;
  } catch {
    return "direct";
  }
}

/** 处理一次 pageview 事件：更新聚合数据 */
export async function processPageView(event: TrackEvent): Promise<void> {
  const data = (await getAnalyticsData()) || {
    total_pv: 0,
    total_visitors: 0,
    daily: {},
    devices: {},
    browsers: {},
    os: {},
    pages: {},
    sources: {},
  };

  const today = new Date().toISOString().slice(0, 10);
  if (!data.daily[today]) {
    data.daily[today] = { pv: 0, visitors: 0, bounces: 0, sessions: 0, total_time: 0 };
  }

  const day = data.daily[today];
  day.pv++;
  data.total_pv++;

  // Device / Browser / OS
  const device = event.device_type || parseDeviceType(event.user_agent, event.screen_width);
  const browser = event.browser || parseBrowser(event.user_agent);
  const os = event.os || parseOS(event.user_agent);

  data.devices[device] = (data.devices[device] || 0) + 1;
  data.browsers[browser] = (data.browsers[browser] || 0) + 1;
  data.os[os] = (data.os[os] || 0) + 1;

  // Page URL (normalize)
  const page = event.page_url || "/";
  data.pages[page] = (data.pages[page] || 0) + 1;

  // Source
  const source = parseSource(event.referrer);
  data.sources[source] = (data.sources[source] || 0) + 1;

  await saveAnalyticsData(data);
}

/** 处理一次 session update */
export async function processSessionUpdate(
  sessionId: string,
  eventType: string
): Promise<void> {
  const admin = await getAdminClient();
  const sessionKey = `analytics_session:${sessionId}`;
  
  if (eventType === "pageview") {
    // First page view of session -> check if new visitor
    const { data: existing } = await admin
      .from("app_config")
      .select("value")
      .eq("key", sessionKey)
      .maybeSingle();

    if (!existing?.value) {
      // New session
      const data = await getAnalyticsData();
      if (data) {
        const today = new Date().toISOString().slice(0, 10);
        data.total_visitors++;
        if (data.daily[today]) {
          data.daily[today].visitors++;
          data.daily[today].sessions++;
        }
        await saveAnalyticsData(data);
      }
    }

    // Save/update session
    await admin.from("app_config").upsert(
      {
        key: sessionKey,
        value: JSON.stringify({
          page_count: existing?.value
            ? (JSON.parse(existing.value).page_count || 0) + 1
            : 1,
          last_seen: new Date().toISOString(),
          bounced: true,
        }),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );
  } else if (eventType === "heartbeat") {
    // Mark session as not bounced
    const { data: s } = await admin
      .from("app_config")
      .select("value")
      .eq("key", sessionKey)
      .maybeSingle();
    if (s?.value) {
      const session = JSON.parse(s.value);
      session.bounced = false;
      session.last_seen = new Date().toISOString();
      await admin.from("app_config").upsert(
        { key: sessionKey, value: JSON.stringify(session), updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );
    }
  } else if (eventType === "leave") {
    // Check if bounced and update stats
    const { data: s } = await admin
      .from("app_config")
      .select("value")
      .eq("key", sessionKey)
      .maybeSingle();
    if (s?.value) {
      const session = JSON.parse(s.value);
      if (session.bounced) {
        const today = new Date().toISOString().slice(0, 10);
        const data = await getAnalyticsData();
        if (data?.daily[today]) {
          data.daily[today].bounces++;
        }
        await saveAnalyticsData(data!);
      }
      // Clean up old sessions
      await admin.from("app_config").delete().eq("key", sessionKey);
    }
  }
}

/** 清理过期 session 记录 */
export async function cleanupOldSessions(): Promise<void> {
  const admin = await getAdminClient();
  const { data } = await admin
    .from("app_config")
    .select("key, value, updated_at")
    .like("key", "analytics_session:%");

  if (!data) return;
  const now = Date.now();
  for (const row of data) {
    const age = now - new Date(row.updated_at).getTime();
    if (age > 30 * 60 * 1000) {
      // Older than 30 min
      if (row.value) {
        try {
          const session = JSON.parse(row.value);
          if (session.bounced) {
            const data = await getAnalyticsData();
            if (data) {
              const today = new Date(row.updated_at).toISOString().slice(0, 10);
              if (data.daily[today]) data.daily[today].bounces++;
              await saveAnalyticsData(data);
            }
          }
        } catch {}
      }
      await admin.from("app_config").delete().eq("key", row.key);
    }
  }
}
