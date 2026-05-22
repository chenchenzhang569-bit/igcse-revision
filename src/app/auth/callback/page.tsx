"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const code = searchParams.get("code");
    const hash = window.location.hash;

    if (code) {
      // PKCE flow
      supabase.auth
        .exchangeCodeForSession(code)
        .then(({ error }) => {
          if (error) {
            router.replace("/login?error=auth_callback_failed");
          } else {
            router.replace("/update-password");
          }
        });
    } else if (hash && hash.includes("access_token")) {
      // Implicit flow — tokens in URL hash
      const params = new URLSearchParams(hash.replace("#", ""));
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");
      if (access_token && refresh_token) {
        supabase.auth
          .setSession({ access_token, refresh_token })
          .then(({ error }) => {
            if (error) {
              router.replace("/login?error=auth_callback_failed");
            } else {
              router.replace("/update-password");
            }
          });
      } else {
        router.replace("/login?error=no_token");
      }
    } else {
      router.replace("/login?error=no_code");
    }

    const timeout = setTimeout(() => {
      router.replace("/login?error=auth_callback_timeout");
    }, 10000);

    return () => clearTimeout(timeout);
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-500">Verifying your identity...</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <p className="text-gray-500">Loading...</p>
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  );
}
