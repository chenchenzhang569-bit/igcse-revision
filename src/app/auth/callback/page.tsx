"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase-client";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const supabase = getSupabaseClient();

    // Wait for the session to be detected from URL hash
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session) {
          const next = searchParams.get("next") || "/login?reset=true";
          router.replace(next);
        }
      }
    );

    // Also check immediately (session might already be set)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const next = searchParams.get("next") || "/login?reset=true";
        router.replace(next);
      }
    });

    // Timeout fallback — if no session after 5s, something went wrong
    const timeout = setTimeout(() => {
      router.replace("/login?error=auth_callback_timeout");
    }, 6000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
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
