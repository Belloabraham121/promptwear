"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { AuthHeading, AuthLayout, AuthNotice } from "@/components/auth/AuthLayout";
import { InkButton } from "@/components/brand/ui";
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
  const linkInvalid = !token || Boolean(linkError);
  const [verifyStatus, setStatus] = useState<Status>({ kind: "verifying" });
  // A missing or errored link is known from the URL alone; no request needed.
  const status: Status = linkInvalid
    ? {
        kind: "error",
        message:
          "This verification link is invalid or expired. Ask for a fresh one from your account.",
      }
    : verifyStatus;
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current || !token || linkError) return;
    attempted.current = true;
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
    <AuthLayout panel="street" headerLink={null}>
      <section aria-label="Verify email">
        <AuthHeading kicker="Account" title="Verify email." />

        {status.kind === "verifying" ? (
          <AuthNotice tone="info" className="mt-8">
            Confirming your email…
          </AuthNotice>
        ) : status.kind === "done" ? (
          <AuthNotice className="mt-8">
            <span className="font-bold text-ink">Email verified.</span> Taking you to your
            dashboard…
          </AuthNotice>
        ) : (
          <div className="mt-8 grid gap-6">
            <AuthNotice tone="error">{status.message}</AuthNotice>
            <InkButton href="/login" className="w-full">
              Back to login
            </InkButton>
          </div>
        )}
      </section>
    </AuthLayout>
  );
}
