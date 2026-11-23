"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient, hasSupabaseConfig } from "@/lib/supabase/client";

interface AuthContextValue {
  user: User | null;
  /** True until Supabase has told us whether someone is signed in. */
  loading: boolean;
  /** False when Supabase URL or anon key is missing. */
  configured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string, next?: string) => Promise<boolean>;
  signInWithGoogle: (next?: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendVerification: (email?: string, next?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function requireAuth() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw Object.assign(new Error("Supabase is not configured"), { code: "app/not-configured" });
  return supabase;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(hasSupabaseConfig);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) { setLoading(false); return; }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (event === "PASSWORD_RECOVERY") router.replace("/update-password");
    });
    void supabase.auth.getSession().catch(() => setLoading(false));
    return () => subscription.unsubscribe();
  }, [router]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await requireAuth().auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw error;
    router.refresh();
  }, [router]);

  const signUp = useCallback(async (name: string, email: string, password: string, next = "/account") => {
    const { data, error } = await requireAuth().auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: name.trim() },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
      }
    });
    if (error) throw error;
    return Boolean(data.session);
  }, []);

  const signInWithGoogle = useCallback(async (next = "/account") => {
    const { error } = await requireAuth().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` }
    });
    if (error) throw error;
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await requireAuth().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/update-password`
    });
    if (error) throw error;
  }, []);

  const resendVerification = useCallback(async (email?: string, next = "/account") => {
    const address = email?.trim() || (await requireAuth().auth.getUser()).data.user?.email;
    if (!address) throw new Error("Enter your email address first.");
    const { error } = await requireAuth().auth.resend({
      type: "signup", email: address,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` }
    });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await requireAuth().auth.signOut();
    if (error) throw error;
    router.refresh();
  }, [router]);

  const value = useMemo<AuthContextValue>(() => ({
    user, loading, configured: hasSupabaseConfig,
    signIn, signUp, signInWithGoogle, resetPassword, resendVerification, signOut
  }), [user, loading, signIn, signUp, signInWithGoogle, resetPassword, resendVerification, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
