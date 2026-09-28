"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { FormEvent, useState } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { authClient } from "@/lib/api/auth-client";

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent"; email: string }
  | { kind: "error"; message: string };

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      setStatus({
        kind: "error",
        message: "Enter the email address for your account.",
      });
      return;
    }
    setStatus({ kind: "sending" });
    try {
      const { error } = await authClient.requestPasswordReset({
        email: trimmed,
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        const message = error.message ?? "";
        setStatus({
          kind: "error",
          message: /invalid email/i.test(message)
            ? "That email address doesn't look valid — check it and try again."
            : "Could not send a reset email. Try again in a moment.",
        });
        return;
      }
      setStatus({ kind: "sent", email: trimmed });
    } catch {
      setStatus({
        kind: "error",
        message: "Could not send a reset email. Try again in a moment.",
      });
    }
  }

  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-clip bg-[#f3f0e8] text-[#0b1f1c]">
      <header className="relative z-20 flex items-center justify-between px-[clamp(1.1rem,3vw,2.4rem)] py-5">
        <BrandLogo href="/" size="sm" />
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 border-b border-current pb-0.5 text-[0.78rem] tracking-[0.06em] uppercase transition-opacity hover:opacity-80"
        >
          Back to login
          <ArrowUpRight size={15} strokeWidth={2.25} />
        </Link>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-[clamp(1.1rem,3vw,2.4rem)] py-8">
        <section
          aria-label="Forgot password"
          className="relative w-full max-w-[26rem] rounded-2xl border border-[#0b1f1c]/10 bg-white p-6 shadow-[0_24px_80px_rgba(11,31,28,0.12)] sm:p-8"
        >
          <p className="m-0 text-[0.68rem] tracking-[0.16em] text-[#5a6b14] uppercase">
            Account
          </p>
          <h1 className="mt-2 mb-7 font-heading text-[1.65rem] font-extrabold tracking-[-0.04em]">
            Forgot password
          </h1>

          {status.kind === "sent" ? (
            <div
              role="status"
              className="grid gap-5 rounded-xl border border-[#5a6b14]/30 bg-[#d6ff3c]/15 p-5"
            >
              <p className="text-[0.95rem] text-[#0b1f1c]">
                <span className="font-bold">Check your inbox.</span> If an
                account exists for{" "}
                <span className="font-semibold">{status.email}</span>, a reset
                link is on its way. It expires in 10 minutes.
              </p>
              <Link
                href="/login"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#d6ff3c] px-5 py-3.5 text-[0.82rem] font-bold tracking-[0.04em] text-[#070807] uppercase transition hover:bg-[#e2ff6a]"
              >
                Back to login
                <ArrowUpRight size={16} strokeWidth={2.25} />
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="grid gap-5" noValidate>
              <p className="text-[0.95rem] text-[#52706a]">
                Enter your account email and we&apos;ll send you a link to set
                a new password.
              </p>

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

              {status.kind === "error" ? (
                <p role="alert" className="text-sm font-semibold text-red-700">
                  {status.message}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={status.kind === "sending"}
                className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#d6ff3c] px-5 py-3.5 text-[0.82rem] font-bold tracking-[0.04em] text-[#070807] uppercase transition-[transform,background] duration-200 hover:-translate-y-px hover:bg-[#e2ff6a] disabled:translate-y-0 disabled:opacity-55"
              >
                {status.kind === "sending" ? "Sending…" : "Send reset link"}
                {status.kind !== "sending" ? (
                  <ArrowUpRight size={16} strokeWidth={2.25} />
                ) : null}
              </button>
            </form>
          )}
        </section>
      </main>

      <footer className="relative z-10 px-[clamp(1.1rem,3vw,2.4rem)] py-5 text-right text-[0.85rem] text-[#52706a]">
        <small className="opacity-65">© 2026 Driblab</small>
      </footer>
    </div>
  );
}
