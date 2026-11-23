"use client";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { friendlyAuthError } from "@/lib/auth-errors";
import { site } from "@/lib/site";

type Mode = "login" | "signup";
type Field = "name" | "email" | "password" | "confirm";
type Values = Record<Field, string>;

const NOT_CONFIGURED =
  "Accounts are temporarily unavailable. Please try again later.";

function validate(mode: Mode, v: Values): Partial<Record<Field, string>> {
  const e: Partial<Record<Field, string>> = {};
  if (mode === "signup" && v.name.trim().length < 2) e.name = "Enter your name.";
  if (!/^\S+@\S+\.\S+$/.test(v.email.trim())) e.email = "Enter a valid email address.";
  if (mode === "login") {
    if (!v.password) e.password = "Enter your password.";
  } else {
    if (v.password.length < 8) e.password = "Use at least 8 characters.";
    if (v.confirm !== v.password) e.confirm = "Passwords don't match.";
  }
  return e;
}

function strength(p: string): number {
  if (!p) return 0;
  let s = 0;
  if (p.length >= 8) s++;
  if (p.length >= 12) s++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++;
  if (/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) s++;
  return Math.max(1, s);
}
const STRENGTH_LABEL = ["", "Weak", "Fair", "Good", "Strong"];
const STRENGTH_COLOR = ["bg-navy/10", "bg-red-500", "bg-orange-400", "bg-gold-dark", "bg-forest-700"];

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

export default function AuthForm({ mode, next, linkError = false }: { mode: Mode; next: string; linkError?: boolean }) {
  const router = useRouter();
  const { user, loading, configured, signIn, signUp, signInWithGoogle, resetPassword, resendVerification } = useAuth();
  const isSignup = mode === "signup";

  const [values, setValues] = useState<Values>({ name: "", email: "", password: "", confirm: "" });
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState<null | "email" | "google" | "reset">(null);
  const [error, setError] = useState(linkError ? "This sign-in link is invalid or expired. Request a new confirmation or password reset email." : "");
  const [info, setInfo] = useState("");

  // Already signed in (or just finished): go where the customer was heading.
  useEffect(() => {
    if (user) router.replace(next);
  }, [user, next, router]);

  const errors = useMemo(() => validate(mode, values), [mode, values]);
  const show = (f: Field) => (touched[f] || submitted ? errors[f] : undefined);
  const score = strength(values.password);

  const set = (f: Field) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues((v) => ({ ...v, [f]: e.target.value }));
    setError(""); setInfo("");
  };
  const blur = (f: Field) => () => setTouched((t) => ({ ...t, [f]: true }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true); setError(""); setInfo("");
    if (Object.keys(errors).length) return;
    if (!configured) { setError(NOT_CONFIGURED); return; }
    setBusy("email");
    try {
      if (isSignup) {
        const signedIn = await signUp(values.name, values.email, values.password, next);
        if (!signedIn) {
          setInfo("Your account was created. Check your email to confirm it, then sign in.");
          setBusy(null);
        }
      } else {
        await signIn(values.email, values.password);
      }
      setBusy(null);
      // Navigation happens in the effect above once Supabase reports the user.
    } catch (err) {
      setError(friendlyAuthError(err));
      setBusy(null);
    }
  }

  async function onGoogle() {
    setError(""); setInfo("");
    if (!configured) { setError(NOT_CONFIGURED); return; }
    setBusy("google");
    try { await signInWithGoogle(next); }
    catch (err) { setError(friendlyAuthError(err)); setBusy(null); }
  }

  async function onForgot() {
    setError(""); setInfo("");
    setTouched((t) => ({ ...t, email: true }));
    if (errors.email) return;
    if (!configured) { setError(NOT_CONFIGURED); return; }
    setBusy("reset");
    try {
      await resetPassword(values.email);
      setInfo(`If an account exists for ${values.email.trim()}, a password reset link is on its way. Check your spam folder too.`);
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === "auth/user-not-found") setInfo(`If an account exists for ${values.email.trim()}, a password reset link is on its way. Check your spam folder too.`);
      else setError(friendlyAuthError(err));
    } finally { setBusy(null); }
  }

  async function onResend() {
    setError(""); setInfo("");
    if (errors.email) { setTouched((t) => ({ ...t, email: true })); return; }
    setBusy("reset");
    try {
      await resendVerification(values.email, next);
      setInfo("If your account needs verification, a confirmation email is on its way.");
    } catch (err) { setError(friendlyAuthError(err)); }
    finally { setBusy(null); }
  }

  const other = isSignup
    ? { href: `/login${next !== "/account" ? `?next=${encodeURIComponent(next)}` : ""}`, text: "Already have an account?", cta: "Sign in" }
    : { href: `/signup${next !== "/account" ? `?next=${encodeURIComponent(next)}` : ""}`, text: "New to Royal Nuts?", cta: "Create an account" };

  const describe = (f: Field) => (show(f) ? `${f}-error` : undefined);

  return (
    <div className="container-page py-10 sm:py-16">
      <div className="mx-auto grid max-w-4xl overflow-hidden border border-gold/40 bg-white lg:grid-cols-[1fr_1.1fr]">
        {/* Brand panel */}
        <div className="relative hidden bg-navy lg:block">
          <Image src={site.heroImage || "/hero/hero.jpg"} alt="" fill sizes="26rem" className="object-contain object-top" unoptimized={(site.heroImage || "/hero/hero.jpg").endsWith(".svg")} />
          <div className="absolute inset-x-0 bottom-0 p-8">
            <p className="font-serif text-2xl text-cream">{site.slogan}</p>
            <p className="mt-1 text-sm text-cream/70">{site.altSlogan}</p>
          </div>
        </div>

        {/* Form */}
        <div className="p-6 sm:p-10">
          <h1 className="text-3xl">{isSignup ? "Create your account" : "Welcome back"}</h1>
          <p className="mt-1 text-sm text-ink/70">
            {isSignup ? "It takes less than a minute." : "Sign in to your Royal Nuts account."}
          </p>

          {!configured && (
            <p role="note" className="mt-5 border border-gold bg-gold-light/40 p-3 text-xs text-navy">
              Accounts are temporarily unavailable. Please try again later or contact us for help.
            </p>
          )}

          {process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH === "true" && <>
          <button type="button" onClick={onGoogle} disabled={busy !== null || loading}
            className="btn-outline-dark mt-6 w-full gap-3 !py-2.5">
            <GoogleIcon /> {busy === "google" ? "Opening Google" : "Continue with Google"}
          </button>

          <div className="my-6 flex items-center gap-3 text-xs text-ink/50" aria-hidden="true">
            <span className="h-px flex-1 bg-navy/15" /> or use your email <span className="h-px flex-1 bg-navy/15" />
          </div>

          </>}
          <form onSubmit={onSubmit} noValidate className="space-y-4">
            {isSignup && (
              <div>
                <label htmlFor="name" className="mb-1 block text-sm font-medium">Full name</label>
                <input id="name" name="name" autoComplete="name" maxLength={100} value={values.name} onChange={set("name")} onBlur={blur("name")}
                  aria-invalid={Boolean(show("name"))} aria-describedby={describe("name")} className="input" />
                {show("name") && <p id="name-error" className="field-error">{show("name")}</p>}
              </div>
            )}

            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium">Email</label>
              <input id="email" name="email" type="email" inputMode="email" maxLength={200} autoComplete="email" value={values.email}
                onChange={set("email")} onBlur={blur("email")} aria-invalid={Boolean(show("email"))} aria-describedby={describe("email")} className="input" />
              {show("email") && <p id="email-error" className="field-error">{show("email")}</p>}
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium">Password</label>
                {!isSignup && (
                  <button type="button" onClick={onForgot} disabled={busy !== null}
                    className="text-xs underline decoration-gold underline-offset-4 hover:text-gold-dark disabled:opacity-50">
                    {busy === "reset" ? "Sending link" : "Forgot password?"}
                  </button>
                )}
              </div>
              <div className="relative">
                <input id="password" name="password" type={showPw ? "text" : "password"}
                  autoComplete={isSignup ? "new-password" : "current-password"} value={values.password}
                  onChange={set("password")} onBlur={blur("password")} aria-invalid={Boolean(show("password"))}
                  aria-describedby={describe("password")} className="input pr-16" />
                <button type="button" onClick={() => setShowPw((s) => !s)} aria-pressed={showPw}
                  className="absolute right-1 top-1/2 -translate-y-1/2 px-2 py-1 text-xs font-medium text-navy hover:text-gold-dark">
                  {showPw ? "Hide" : "Show"}
                </button>
              </div>
              {show("password") && <p id="password-error" className="field-error">{show("password")}</p>}
              {isSignup && (
                <div className="mt-2" aria-live="polite">
                  <div className="flex gap-1" aria-hidden="true">
                    {[1, 2, 3, 4].map((i) => (
                      <span key={i} className={`h-1 flex-1 rounded-full transition-colors ${score >= i ? STRENGTH_COLOR[score] : "bg-navy/10"}`} />
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-ink/60">
                    {score ? `Password strength: ${STRENGTH_LABEL[score]}` : "Use 8 or more characters. A mix of letters, numbers and symbols is stronger."}
                  </p>
                </div>
              )}
            </div>

            {isSignup && (
              <div>
                <label htmlFor="confirm" className="mb-1 block text-sm font-medium">Confirm password</label>
                <input id="confirm" name="confirm" type={showPw ? "text" : "password"} autoComplete="new-password"
                  value={values.confirm} onChange={set("confirm")} onBlur={blur("confirm")}
                  aria-invalid={Boolean(show("confirm"))} aria-describedby={describe("confirm")} className="input" />
                {show("confirm") && <p id="confirm-error" className="field-error">{show("confirm")}</p>}
              </div>
            )}

            {error && <p role="alert" className="border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
            {info && <p role="status" className="border border-forest/20 bg-forest/5 p-3 text-sm text-forest">{info}</p>}

            <button className="btn-navy w-full" disabled={busy !== null || loading}>
              {busy === "email" ? (isSignup ? "Creating account" : "Signing in") : isSignup ? "Create account" : "Sign in"}
            </button>
          </form>

          <button type="button" onClick={onResend} disabled={busy !== null || !configured || loading}
            className="mt-4 text-xs underline decoration-gold underline-offset-4 disabled:opacity-50">
            Resend confirmation email
          </button>
          <p className="mt-6 text-center text-sm text-ink/70">
            {other.text}{" "}
            <Link href={other.href} className="font-semibold text-navy underline decoration-gold underline-offset-4 hover:text-gold-dark">{other.cta}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
