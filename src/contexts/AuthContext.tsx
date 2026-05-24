"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  warning: string | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  warning: null,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter(); // only works inside <Router> — ensure layout wraps with it

  // Run security check after login
  const runSecurityCheck = async (accessToken: string) => {
    try {
      const res = await fetch("/api/security/check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
      });
      const data = await res.json();

      if (data.banned) {
        setUser(null);
        window.location.href = "/banned";
        return;
      }
      if (data.warning) {
        setWarning(data.message || "⚠️ 检测到异常登录");
      }
    } catch {
      // fail silent — don't block login
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.access_token) {
        runSecurityCheck(session.access_token);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN") {
        setUser(session?.user ?? null);
        setLoading(false);
        if (session?.access_token) {
          runSecurityCheck(session.access_token);
        }
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setWarning(null);
        setLoading(false);
      } else {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setWarning(null);
    window.location.href = "/";
  };

  return (
    <AuthContext.Provider value={{ user, loading, warning, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
