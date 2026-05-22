"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase-client";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const supabase = getSupabaseClient();

    // Supabase SSR PKCE flow: the URL hash contains the recovery code
    // supabase.auth.exchangeCodeForSession() handles the token exchange
    supabase.auth
      .exchangeCodeForSession(
        window.location.search + window.location.hash
      )
      .then(({ error }) => {
        if (error) {
          console.error("Auth callback error:", error);
          router.replace("/login?error=auth_callback_failed");
        } else {
          // Redirect to reset password form
          const next = searchParams.get("next") || "/login?reset=true";
          router.replace("/login?reset=true");
        }
      })
      .catch((err) => {
        console.error("Auth callback exception:", err);
        router.replace("/login?error=auth_callback_failed");
      });
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
