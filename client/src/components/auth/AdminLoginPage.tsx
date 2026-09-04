"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Eye, EyeOff } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/errors";
import { useAuth } from "@/providers/AuthProvider";

export function AdminLoginPage() {
  const router = useRouter();
  const { login, session, isAuthenticated, isLoading: authLoading } =
    useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (isAuthenticated && session?.role === "admin") {
      router.replace("/dashboard/admin");
    }
  }, [authLoading, isAuthenticated, session?.role, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      toast.error("Enter your admin email and password.");
      return;
    }
    if (password.length < 8) {
      toast.error("Password needs at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      const user = await login({
        email: email.trim(),
        password,
        portal: "admin",
      });
      toast.success("Welcome back");
      router.push("/dashboard/admin");
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Something went wrong. Try again in a moment.",
      );
      setLoading(false);
    }
  }

  if (authLoading || (isAuthenticated && session?.role === "admin")) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#070807] text-[#c8c4b8]">
        <p className="text-sm tracking-[0.08em] uppercase">Loading…</p>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-clip bg-[#070807] text-[#f3f0e8]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_65%_50%_at_80%_20%,rgba(214,255,60,0.1),transparent_55%),radial-gradient(ellipse_45%_40%_at_10%_85%,rgba(80,100,90,0.18),transparent_50%),linear-gradient(165deg,#0c0e0b_0%,#070807_48%,#10140f_100%)]"
      />

      <header className="relative z-20 flex items-center justify-between px-[clamp(1.1rem,3vw,2.4rem)] py-5">
        <Link
          href="/"
          className="font-heading text-[1.05rem] font-bold tracking-[-0.04em] lowercase transition-opacity hover:opacity-80"
          aria-label="Driplap home"
        >
          driplap
        </Link>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-[clamp(1.1rem,3vw,2.4rem)] py-8">
        <section
          aria-label="Admin log in"
          className="relative w-full max-w-[26rem] border border-[color-mix(in_oklab,#f3f0e8_12%,transparent)] bg-[color-mix(in_oklab,#070807_78%,transparent)] p-6 backdrop-blur-sm sm:p-8"
        >
          <p className="m-0 text-[0.68rem] tracking-[0.16em] text-[#d6ff3c] uppercase">
            Staff
          </p>
          <h1 className="mt-2 mb-7 font-heading text-[1.65rem] font-extrabold tracking-[-0.04em]">
            Admin login
          </h1>

          <form onSubmit={handleSubmit} className="grid gap-5" noValidate>
            <label className="grid gap-2">
              <span className="text-[0.68rem] tracking-[0.14em] text-[#c8c4b8] uppercase">
                Email
              </span>
              <input
                type="email"
                name="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@email.com"
                className="w-full border border-[color-mix(in_oklab,#f3f0e8_16%,transparent)] bg-[color-mix(in_oklab,#f3f0e8_4%,transparent)] px-3.5 py-3 text-[1rem] text-[#f3f0e8] outline-none transition-colors placeholder:text-[#c8c4b8]/60 focus:border-[#d6ff3c]"
              />
            </label>

            <div className="grid gap-2">
              <label
                htmlFor="admin-password"
                className="text-[0.68rem] tracking-[0.14em] text-[#c8c4b8] uppercase"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  className="w-full border border-[color-mix(in_oklab,#f3f0e8_16%,transparent)] bg-[color-mix(in_oklab,#f3f0e8_4%,transparent)] px-3.5 py-3 pr-11 text-[1rem] text-[#f3f0e8] outline-none transition-colors placeholder:text-[#c8c4b8]/60 focus:border-[#d6ff3c]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute top-1/2 right-2.5 -translate-y-1/2 p-1 text-[#c8c4b8] transition-colors hover:text-[#f3f0e8]"
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
              disabled={loading}
              className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-[2px] bg-[#d6ff3c] px-5 py-3.5 text-[0.82rem] font-bold tracking-[0.04em] text-[#070807] uppercase transition-[transform,background] duration-200 hover:-translate-y-px hover:bg-[color-mix(in_oklab,#d6ff3c_88%,white)] disabled:translate-y-0 disabled:opacity-55"
            >
              {loading ? "Signing in…" : "Enter admin"}
              {!loading ? <ArrowUpRight size={16} strokeWidth={2.25} /> : null}
            </button>
          </form>
        </section>
      </main>

      <footer className="relative z-10 px-[clamp(1.1rem,3vw,2.4rem)] py-5 text-right text-[0.85rem] text-[#c8c4b8]">
        <small className="opacity-65">© 2026 Driplap</small>
      </footer>
    </div>
  );
}
