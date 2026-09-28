"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpRight, Eye, EyeOff } from "lucide-react";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { authClient } from "@/lib/api/auth-client";
import { ApiError } from "@/lib/api/errors";
import { useAuth } from "@/providers/AuthProvider";

type Mode = "signin" | "signup";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function AuthPage({ initialMode = "signin" }: { initialMode?: Mode }) {
  return (
    <Suspense fallback={null}>
      <AuthPageInner initialMode={initialMode} />
    </Suspense>
  );
}

function AuthPageInner({ initialMode = "signin" }: { initialMode?: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    login,
    register,
    session,
    isAuthenticated,
    isLoading: authLoading,
  } = useAuth();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState<"email" | "google" | null>(null);

  const isSignup = mode === "signup";

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    if (session?.role === "admin") {
      router.replace("/dashboard/admin");
      return;
    }
    router.replace("/dashboard");
  }, [authLoading, isAuthenticated, session?.role, router]);

  useEffect(() => {
    const oauthError = searchParams.get("error");
    if (oauthError) {
      toast.error(oauthError);
    }
  }, [searchParams]);

  function switchMode(next: Mode) {
    setMode(next);
  }

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      toast.error("Enter your email and password to continue.");
      return;
    }
    if (isSignup && !name.trim()) {
      toast.error("Add your name so we know who to print for.");
      return;
    }
    if (password.length < 8) {
      toast.error("Password needs at least 8 characters.");
      return;
    }

    setLoading("email");
    try {
      if (isSignup) {
        await register({
          name: name.trim(),
          email: email.trim(),
          password,
        });
      } else {
        await login({
          email: email.trim(),
          password,
        });
      }
      toast.success(isSignup ? "Account created" : "Welcome back");
      router.push("/dashboard");
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Something went wrong. Try again in a moment.",
      );
      setLoading(null);
    }
  }

  async function handleGoogle() {
    setLoading("google");
    try {
      // Better Auth redirects the browser to Google; on return the session
      // cookie is set and useSession picks it up (same verified email links
      // to an existing password account instead of conflicting).
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/dashboard",
      });
    } catch {
      toast.error("Google sign-in failed. Try again in a moment.");
      setLoading(null);
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      toast.error("Enter your email above first, then use Forgot.");
      return;
    }
    try {
      const { error } = await authClient.requestPasswordReset({
        email: email.trim(),
        redirectTo: "/reset-password",
      });
      if (error) {
        toast.error("Could not send a reset email. Try again in a moment.");
        return;
      }
      toast.success("Check your inbox for a reset link");
    } catch {
      toast.error("Could not send a reset email. Try again in a moment.");
    }
  }

  if (authLoading || isAuthenticated) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#f3f0e8] text-[#52706a]">
        <p className="text-sm tracking-[0.08em] uppercase">Loading…</p>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-clip bg-[#f3f0e8] text-[#0b1f1c]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_65%_50%_at_80%_20%,rgba(214,255,60,0.28),transparent_55%),radial-gradient(ellipse_45%_40%_at_10%_85%,rgba(90,138,127,0.2),transparent_50%),linear-gradient(165deg,#faf8f3_0%,#f3f0e8_48%,#e9e4d6_100%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-[12%] top-[5%] h-[52vmin] w-[52vmin] rounded-full bg-[radial-gradient(circle,rgba(214,255,60,0.14),transparent_68%)] blur-3xl motion-safe:animate-[nf-glow_8s_ease-in-out_infinite]"
      />

      <header className="relative z-20 flex items-center justify-between px-[clamp(1.1rem,3vw,2.4rem)] py-5">
        <BrandLogo href="/" size="sm" />
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 border-b border-current pb-0.5 text-[0.78rem] tracking-[0.06em] uppercase transition-opacity hover:opacity-80"
        >
          Continue as guest
          <ArrowUpRight size={15} strokeWidth={2.25} />
        </Link>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-[clamp(1.1rem,3vw,2.4rem)] py-8">
        <section
          aria-label={isSignup ? "Sign up" : "Log in"}
          className="relative w-full max-w-[26rem] rounded-2xl border border-[#0b1f1c]/10 bg-white p-6 shadow-[0_24px_80px_rgba(11,31,28,0.12)] sm:p-8 motion-safe:animate-[nf-fade-up_0.85s_ease-out_both]"
        >
          <h1 className="sr-only">
            {isSignup ? "Create your Driplap account" : "Log in to Driplap"}
          </h1>

          <div
            role="tablist"
            aria-label="Authentication mode"
            className="mb-7 flex gap-6 border-b border-[#0b1f1c]/10"
          >
            {(
              [
                ["signin", "Log in"],
                ["signup", "Sign up"],
              ] as const
            ).map(([value, label]) => {
              const active = mode === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => switchMode(value)}
                  className={`relative pb-3 font-heading text-[0.78rem] font-bold tracking-[0.12em] uppercase transition-colors ${
                    active
                      ? "text-[#0b1f1c]"
                      : "text-[#52706a] hover:text-[#0b1f1c]"
                  }`}
                >
                  {label}
                  {active ? (
                    <span className="absolute inset-x-0 -bottom-px h-0.5 bg-[#d6ff3c]" />
                  ) : null}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading !== null}
            className="flex w-full items-center justify-center gap-3 border border-[#0b1f1c]/15 px-4 py-3.5 text-[0.82rem] font-bold tracking-[0.04em] uppercase transition-[border-color,background,transform] duration-200 hover:border-[#0b1f1c]/30 hover:bg-[#0b1f1c]/5 disabled:opacity-55"
          >
            <GoogleIcon className="size-[1.15rem]" />
            {loading === "google"
              ? "Connecting…"
              : isSignup
                ? "Sign up with Google"
                : "Continue with Google"}
          </button>

          <div className="my-6 flex items-center gap-3 text-[0.68rem] tracking-[0.14em] text-[#52706a] uppercase">
            <span className="h-px flex-1 bg-[#0b1f1c]/10" />
            or with email
            <span className="h-px flex-1 bg-[#0b1f1c]/10" />
          </div>

          <form onSubmit={handleEmailSubmit} className="grid gap-5" noValidate>
            {isSignup ? (
              <label className="grid gap-2">
                <span className="text-[0.68rem] tracking-[0.14em] text-[#52706a] uppercase">
                  Name
                </span>
                <input
                  type="text"
                  name="name"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full border border-[#0b1f1c]/15 bg-white px-3.5 py-3 text-[1rem] text-[#0b1f1c] outline-none transition-colors placeholder:text-[#52706a]/60 focus:border-[#0b1f1c]"
                />
              </label>
            ) : null}

            <label className="grid gap-2">
              <span className="text-[0.68rem] tracking-[0.14em] text-[#52706a] uppercase">
                Email
              </span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="w-full border border-[#0b1f1c]/15 bg-white px-3.5 py-3 text-[1rem] text-[#0b1f1c] outline-none transition-colors placeholder:text-[#52706a]/60 focus:border-[#0b1f1c]"
              />
            </label>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="auth-password"
                  className="text-[0.68rem] tracking-[0.14em] text-[#52706a] uppercase"
                >
                  Password
                </label>
                {!isSignup ? (
                  <button
                    type="button"
                    className="text-[0.68rem] tracking-[0.08em] text-[#52706a] transition-colors hover:text-[#0b1f1c]"
                    onClick={() => void handleForgotPassword()}
                  >
                    Forgot?
                  </button>
                ) : null}
              </div>
              <div className="relative">
                <input
                  id="auth-password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete={isSignup ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={
                    isSignup ? "At least 8 characters" : "Your password"
                  }
                  className="w-full border border-[#0b1f1c]/15 bg-white px-3.5 py-3 pr-11 text-[1rem] text-[#0b1f1c] outline-none transition-colors placeholder:text-[#52706a]/60 focus:border-[#0b1f1c]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute top-1/2 right-2.5 -translate-y-1/2 p-1 text-[#52706a] transition-colors hover:text-[#0b1f1c]"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff size={18} strokeWidth={1.75} />
                  ) : (
                    <Eye size={18} strokeWidth={1.75} />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading !== null}
              className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#d6ff3c] px-5 py-3.5 text-[0.82rem] font-bold tracking-[0.04em] text-[#070807] uppercase transition-[transform,background] duration-200 hover:-translate-y-px hover:bg-[#e2ff6a] disabled:translate-y-0 disabled:opacity-55"
            >
              {loading === "email"
                ? "Working…"
                : isSignup
                  ? "Create account"
                  : "Log in"}
              {loading !== "email" ? (
                <ArrowUpRight size={16} strokeWidth={2.25} />
              ) : null}
            </button>
          </form>
        </section>
      </main>

      <footer className="relative z-10 px-[clamp(1.1rem,3vw,2.4rem)] py-5 text-right text-[0.85rem] text-[#52706a]">
        <small className="opacity-65">© 2026 Driplap</small>
      </footer>
    </div>
  );
}
