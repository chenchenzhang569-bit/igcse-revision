"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    __igSessionId?: string;
  }
}

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let sid = window.__igSessionId;
  if (!sid) {
    try {
      sid = localStorage.getItem("ig_session_id");
    } catch {}
    if (!sid) {
      sid = crypto.randomUUID?.() || Math.random().toString(36).slice(2, 15);
      try {
        localStorage.setItem("ig_session_id", sid);
      } catch {}
    }
    window.__igSessionId = sid;
  }
  return sid;
}

function getDeviceInfo() {
  if (typeof window === "undefined") return { ua: "", w: 0, h: 0, lang: "" };
  const ua = navigator.userAgent;
  let device = "";
  if (/mobile|android.*mobile|iphone|ipod/i.test(ua)) device = "mobile";
  else if (/ipad|tablet|android(?!.*mobile)/i.test(ua)) device = "tablet";
  else device = "desktop";
  const browser = /micromessenger/i.test(ua)
    ? "wechat"
    : /edg/i.test(ua)
    ? "edge"
    : /chrome/i.test(ua)
    ? "chrome"
    : /safari/i.test(ua)
    ? "safari"
    : /firefox/i.test(ua)
    ? "firefox"
    : "other";
  const os = /windows/i.test(ua)
    ? "windows"
    : /macintosh|mac os/i.test(ua)
    ? "macos"
    : /iphone|ipad/i.test(ua)
    ? "ios"
    : /android/i.test(ua)
    ? "android"
    : /linux/i.test(ua)
    ? "linux"
    : "other";
  return {
    ua,
    device,
    browser,
    os,
    w: window.innerWidth,
    h: window.innerHeight,
    lang: navigator.language,
  };
}

function getReferrer(): string {
  try {
    // Respect Do Not Track
    if (navigator.doNotTrack === "1") return "";
    return document.referrer || "";
  } catch {
    return "";
  }
}

export function AnalyticsTracker() {
  const lastUrl = useRef("");
  const heartbeatRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    const sid = getSessionId();
    const di = getDeviceInfo();
    const ref = getReferrer();

    const track = (eventType: "pageview" | "heartbeat" | "leave") => {
      const url = window.location.pathname + window.location.search;
      fetch("/api/analytics/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sid,
          page_url: url,
          referrer: ref,
          user_agent: di.ua,
          device_type: di.device,
          browser: di.browser,
          os: di.os,
          screen_width: di.w,
          screen_height: di.h,
          language: di.lang,
          event_type: eventType,
        }),
        // Use keepalive so leave events don't get cancelled on unload
        keepalive: true,
      }).catch(() => {}); // Fire and forget
    };

    // Track initial pageview (only if URL changed since mount)
    if (lastUrl.current !== window.location.href) {
      lastUrl.current = window.location.href;
      track("pageview");
    }

    // Heartbeat every 30s to mark session as still active (not bounced)
    heartbeatRef.current = setInterval(() => track("heartbeat"), 30000);

    // Track leave / unload
    const handleBeforeUnload = () => track("leave");
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Track SPA navigation
    const handlePopState = () => {
      if (lastUrl.current !== window.location.href) {
        lastUrl.current = window.location.href;
        track("pageview");
      }
    };
    window.addEventListener("popstate", handlePopState);

    // Monkey-patch pushState/replaceState for SPA route changes
    const origPushState = history.pushState;
    history.pushState = function (...args) {
      origPushState.apply(this, args);
      if (lastUrl.current !== window.location.href) {
        lastUrl.current = window.location.href;
        // Delay a bit so the page can update
        setTimeout(() => track("pageview"), 100);
      }
    };
    const origReplaceState = history.replaceState;
    history.replaceState = function (...args) {
      origReplaceState.apply(this, args);
      if (lastUrl.current !== window.location.href) {
        lastUrl.current = window.location.href;
        setTimeout(() => track("pageview"), 100);
      }
    };

    return () => {
      clearInterval(heartbeatRef.current);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
      // Restore original history methods
      history.pushState = origPushState;
      history.replaceState = origReplaceState;
    };
  }, []);

  return null;
}
