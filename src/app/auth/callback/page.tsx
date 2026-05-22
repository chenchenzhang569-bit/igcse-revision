"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://aondldqwwvttwpervrfq.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_m64KijPCmhkIDD1J0RV_kw_uCVbl6pL";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Create fresh client INSIDE useEffect — runs ONLY in browser
    // Singleton getSupabaseClient() was created during SSR = never saw URL hash
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const next = searchParams.get("next") || "/login?reset=true";

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session) {
          router.replace(next);
        }
      }
    );

    // Also check immediate (session may already be set)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace(next);
      }
    });

    const timeout = setTimeout(() => {
      router.replace("/login?error=auth_callback_failed");
    }, 8000);

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
