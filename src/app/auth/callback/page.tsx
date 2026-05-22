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

    if (code) {
      // PKCE flow: exchange code for session (sets cookies automatically)
      supabase.auth
        .exchangeCodeForSession(code)
        .then(({ error }) => {
          if (error) {
            console.error("[callback] exchange error:", error.message);
            router.replace("/login?error=auth_callback_failed");
          } else {
            console.log("[callback] exchange success → update-password");
            router.replace("/update-password");
          }
        });
    } else {
      console.log("[callback] no code in URL");
      router.replace("/login?error=no_code");
    }

    // Safety timeout
    const timeout = setTimeout(() => {
      console.log("[callback] timeout");
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
