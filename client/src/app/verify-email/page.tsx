"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { Suspense, useEffect, useRef, useState } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { authClient } from "@/lib/api/auth-client";

type Status =
  | { kind: "verifying" }
  | { kind: "done" }
  | { kind: "error"; message: string };

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailInner />
    </Suspense>
  );
}

function VerifyEmailInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const linkError = searchParams.get("error");
  const [status, setStatus] = useState<Status>({ kind: "verifying" });
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;
    if (!token || linkError) {
      setStatus({
        kind: "error",
        message:
          "This verification link is invalid or expired. Ask for a fresh one from your account.",
      });
      return;
    }
    authClient.verifyEmail({ query: { token } }).then(({ error }) => {
      if (error) {
        setStatus({
          kind: "error",
          message:
            "This verification link is invalid or expired. Ask for a fresh one from your account.",
        });
        return;
      }
      setStatus({ kind: "done" });
      window.setTimeout(() => router.push("/dashboard"), 1500);
    });
  }, [token, linkError, router]);

  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-clip bg-[#f3f0e8] text-[#0b1f1c]">
      <header className="relative z-20 flex items-center justify-between px-[clamp(1.1rem,3vw,2.4rem)] py-5">
        <BrandLogo href="/" size="sm" />
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-[clamp(1.1rem,3vw,2.4rem)] py-8">
        <section
          aria-label="Verify email"
          className="relative w-full max-w-[26rem] rounded-2xl border border-[#0b1f1c]/10 bg-white p-6 shadow-[0_24px_80px_rgba(11,31,28,0.12)] sm:p-8"
        >
          <p className="m-0 text-[0.68rem] tracking-[0.16em] text-[#5a6b14] uppercase">
            Account
          </p>
          <h1 className="mt-2 mb-7 font-heading text-[1.65rem] font-extrabold tracking-[-0.04em]">
            Verify email
          </h1>

          {status.kind === "verifying" ? (
            <p role="status" className="text-[0.95rem] text-[#52706a]">
              Confirming your email…
            </p>
          ) : status.kind === "done" ? (
            <div
              role="status"
              className="grid gap-5 rounded-xl border border-[#5a6b14]/30 bg-[#d6ff3c]/15 p-5"
            >
              <p className="text-[0.95rem] text-[#0b1f1c]">
                <span className="font-bold">Email verified.</span> Taking you
                to your dashboard…
              </p>
            </div>
          ) : (
            <div className="grid gap-5">
              <p role="alert" className="text-[0.95rem] text-red-700">
                {status.message}
              </p>
              <Link
                href="/login"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#d6ff3c] px-5 py-3.5 text-[0.82rem] font-bold tracking-[0.04em] text-[#070807] uppercase transition hover:bg-[#e2ff6a]"
              >
                Back to login
                <ArrowUpRight size={16} strokeWidth={2.25} />
              </Link>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
