"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { FormEvent, Suspense, useState } from "react";
import { toast } from "sonner";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { authClient } from "@/lib/api/auth-client";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordInner />
    </Suspense>
  );
}

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const linkError = searchParams.get("error");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const linkInvalid = !token || linkError;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    if (password.length < 8) {
      toast.error("Password needs at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await authClient.resetPassword({
        newPassword: password,
        token,
      });
      if (error) {
        toast.error("This reset link is invalid or expired. Ask for a new one.");
        setLoading(false);
        return;
      }
      setDone(true);
      toast.success("Password updated — log in with your new password");
      router.push("/login");
    } catch {
      toast.error("Something went wrong. Try again in a moment.");
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-clip bg-[#f3f0e8] text-[#0b1f1c]">
      <header className="relative z-20 flex items-center justify-between px-[clamp(1.1rem,3vw,2.4rem)] py-5">
        <BrandLogo href="/" size="sm" />
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-[clamp(1.1rem,3vw,2.4rem)] py-8">
        <section
          aria-label="Reset password"
          className="relative w-full max-w-[26rem] rounded-2xl border border-[#0b1f1c]/10 bg-white p-6 shadow-[0_24px_80px_rgba(11,31,28,0.12)] sm:p-8"
        >
          <p className="m-0 text-[0.68rem] tracking-[0.16em] text-[#5a6b14] uppercase">
            Account
          </p>
          <h1 className="mt-2 mb-7 font-heading text-[1.65rem] font-extrabold tracking-[-0.04em]">
            Reset password
          </h1>

          {linkInvalid ? (
            <div className="grid gap-5">
              <p className="text-[0.95rem] text-[#52706a]">
                {linkError
                  ? "This reset link is invalid or expired."
                  : "This page needs a reset link from your email."}{" "}
                Ask for a fresh one from the login page.
              </p>
              <Link
                href="/login"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#d6ff3c] px-5 py-3.5 text-[0.82rem] font-bold tracking-[0.04em] text-[#070807] uppercase transition-[transform,background] duration-200 hover:-translate-y-px hover:bg-[#e2ff6a]"
              >
                Back to login
                <ArrowUpRight size={16} strokeWidth={2.25} />
              </Link>
            </div>
          ) : done ? (
            <p className="text-[0.95rem] text-[#52706a]">
              Password updated. Redirecting you to login…
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="grid gap-5" noValidate>
              <label className="grid gap-2">
                <span className="text-[0.68rem] tracking-[0.14em] text-[#52706a] uppercase">
                  New password
                </span>
                <input
                  type="password"
                  name="new-password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full border border-[#0b1f1c]/15 bg-white px-3.5 py-3 text-[1rem] text-[#0b1f1c] outline-none transition-colors placeholder:text-[#52706a]/60 focus:border-[#0b1f1c]"
                />
              </label>

              <button
                type="submit"
                disabled={loading}
                className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#d6ff3c] px-5 py-3.5 text-[0.82rem] font-bold tracking-[0.04em] text-[#070807] uppercase transition-[transform,background] duration-200 hover:-translate-y-px hover:bg-[#e2ff6a] disabled:translate-y-0 disabled:opacity-55"
              >
                {loading ? "Working…" : "Set new password"}
                {!loading ? <ArrowUpRight size={16} strokeWidth={2.25} /> : null}
              </button>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
