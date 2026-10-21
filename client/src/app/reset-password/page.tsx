"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { toast } from "sonner";
import { AuthHeading, AuthLayout, AuthNotice } from "@/components/auth/AuthLayout";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { BrandButton, FieldLabel, InkButton } from "@/components/brand/ui";
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
    <AuthLayout panel="studio" headerLink={{ href: "/login", label: "Back to login" }}>
      <section aria-label="Reset password">
        <AuthHeading
          kicker="Account"
          title="New password."
          lead={linkInvalid || done ? undefined : "Choose a password with at least 8 characters."}
        />

        {linkInvalid ? (
          <div className="mt-8 grid gap-6">
            <AuthNotice tone="error">
              {linkError
                ? "This reset link is invalid or expired."
                : "This page needs a reset link from your email."}{" "}
              Request a fresh one below.
            </AuthNotice>
            <InkButton href="/forgot-password" className="w-full">
              Get a new link
            </InkButton>
          </div>
        ) : done ? (
          <AuthNotice className="mt-8">
            <span className="font-bold text-ink">Password updated.</span> Taking you to log in…
          </AuthNotice>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 grid gap-5" noValidate>
            <div className="grid gap-2">
              <FieldLabel htmlFor="reset-password">New password</FieldLabel>
              <PasswordInput
                id="reset-password"
                name="new-password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
              />
            </div>

            <BrandButton type="submit" disabled={loading} arrow={!loading} className="mt-2 w-full">
              {loading ? "Working…" : "Set new password"}
            </BrandButton>
          </form>
        )}
      </section>
    </AuthLayout>
  );
}
