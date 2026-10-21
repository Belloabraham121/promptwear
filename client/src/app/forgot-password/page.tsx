"use client";

import { FormEvent, useState } from "react";
import { AuthHeading, AuthLayout, AuthNotice } from "@/components/auth/AuthLayout";
import { BrandButton, FieldLabel, InkButton, TextInput } from "@/components/brand/ui";
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
    <AuthLayout panel="studio" headerLink={{ href: "/login", label: "Back to login" }}>
      <section aria-label="Forgot password">
        <AuthHeading
          kicker="Account"
          title="Forgot password."
          lead={
            status.kind === "sent"
              ? undefined
              : "Enter your account email and we'll send you a link to set a new password."
          }
        />

        {status.kind === "sent" ? (
          <div className="mt-8 grid gap-6">
            <AuthNotice>
              <span className="font-bold text-ink">Check your inbox.</span> If an account exists for{" "}
              <span className="font-semibold text-ink">{status.email}</span>, a reset link is on its
              way. It expires in 10 minutes.
            </AuthNotice>
            <InkButton href="/login" className="w-full">
              Back to login
            </InkButton>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 grid gap-5" noValidate>
            <div className="grid gap-2">
              <FieldLabel htmlFor="forgot-email">Email</FieldLabel>
              <TextInput
                id="forgot-email"
                type="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
              />
            </div>

            {status.kind === "error" ? <AuthNotice tone="error">{status.message}</AuthNotice> : null}

            <BrandButton
              type="submit"
              disabled={status.kind === "sending"}
              arrow={status.kind !== "sending"}
              className="mt-2 w-full"
            >
              {status.kind === "sending" ? "Sending…" : "Send reset link"}
            </BrandButton>
          </form>
        )}
      </section>
    </AuthLayout>
  );
}
