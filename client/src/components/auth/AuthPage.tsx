"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { BrandButton, FieldLabel, Kicker, Rule, TextInput } from "@/components/brand/ui";
import { authClient } from "@/lib/api/auth-client";
import { ApiError } from "@/lib/api/errors";
import { useAuth } from "@/providers/AuthProvider";
import { cn } from "@/lib/utils";

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
        callbackURL: `${window.location.origin}/dashboard`,
      });
    } catch {
      toast.error("Google sign-in failed. Try again in a moment.");
      setLoading(null);
    }
  }

  if (authLoading || isAuthenticated) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bone text-mute">
        <p className="text-[0.7rem] font-semibold tracking-[0.2em] uppercase">Loading…</p>
      </div>
    );
  }

  return (
    <AuthLayout panel={isSignup ? "street" : "studio"}>
      <section aria-label={isSignup ? "Sign up" : "Log in"}>
        <Kicker index={isSignup ? "02" : "01"} className="text-olive">
          {isSignup ? "Join the community" : "Members"}
        </Kicker>
        <h1 className="mt-5 mb-0 font-heading text-[clamp(2.4rem,6vw,3.4rem)] leading-[0.92] font-extrabold tracking-[-0.055em]">
          {isSignup ? "Join Driplab." : "Welcome back."}
        </h1>
        <p className="mt-4 mb-0 max-w-[36ch] text-[0.95rem] leading-[1.55] text-mute">
          {isSignup
            ? "Save your designs, track your orders and earn when the community wears your work."
            : "Pick up where you left off — your designs and orders are waiting."}
        </p>

        <div
          role="tablist"
          aria-label="Authentication mode"
          className="mt-8 mb-7 flex gap-7 border-b border-ink/12"
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
                className={cn(
                  "relative pb-3 text-[0.72rem] font-bold tracking-[0.2em] uppercase transition-colors",
                  active ? "text-ink" : "text-mute hover:text-ink",
                )}
              >
                {label}
                {active ? <span className="absolute inset-x-0 -bottom-px h-0.5 bg-ink" /> : null}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading !== null}
          className="flex w-full items-center justify-center gap-3 border border-ink/15 bg-paper px-4 py-4 text-[0.75rem] font-bold tracking-[0.16em] uppercase transition-colors hover:border-ink disabled:opacity-55"
        >
          <GoogleIcon className="size-[1.1rem]" />
          {loading === "google"
            ? "Connecting…"
            : isSignup
              ? "Sign up with Google"
              : "Continue with Google"}
        </button>

        <Rule label="or with email" className="my-7" />

        <form onSubmit={handleEmailSubmit} className="grid gap-5" noValidate>
          {isSignup ? (
            <div className="grid gap-2">
              <FieldLabel htmlFor="auth-name">Name</FieldLabel>
              <TextInput
                id="auth-name"
                type="text"
                name="name"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </div>
          ) : null}

          <div className="grid gap-2">
            <FieldLabel htmlFor="auth-email">Email</FieldLabel>
            <TextInput
              id="auth-email"
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
            />
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor="auth-password">Password</FieldLabel>
              {!isSignup ? (
                <Link
                  href="/forgot-password"
                  className="text-[0.66rem] font-semibold tracking-[0.16em] text-mute uppercase transition-colors hover:text-ink"
                >
                  Forgot?
                </Link>
              ) : null}
            </div>
            <div className="relative">
              <TextInput
                id="auth-password"
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete={isSignup ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isSignup ? "At least 8 characters" : "Your password"}
                className="pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute top-1/2 right-3 -translate-y-1/2 p-1 text-mute transition-colors hover:text-ink"
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

          <BrandButton
            type="submit"
            disabled={loading !== null}
            arrow={loading !== "email"}
            className="mt-2 w-full"
          >
            {loading === "email" ? "Working…" : isSignup ? "Create account" : "Log in"}
          </BrandButton>
        </form>

        <p className="mt-8 mb-0 text-[0.9rem] text-mute">
          {isSignup ? "Already have an account? " : "New to Driplab? "}
          <button
            type="button"
            onClick={() => switchMode(isSignup ? "signin" : "signup")}
            className="font-semibold text-ink underline decoration-ink/30 underline-offset-4 transition-colors hover:decoration-ink"
          >
            {isSignup ? "Log in" : "Create an account"}
          </button>
        </p>
      </section>
    </AuthLayout>
  );
}
