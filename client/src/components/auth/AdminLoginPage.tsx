"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { AuthHeading, AuthLayout } from "@/components/auth/AuthLayout";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { BrandButton, FieldLabel, TextInput } from "@/components/brand/ui";
import { ApiError } from "@/lib/api/errors";
import { useAuth } from "@/providers/AuthProvider";

export function AdminLoginPage() {
  const router = useRouter();
  const { login, logout, session, isAuthenticated, isLoading: authLoading } =
    useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      });
      // Portal gating is client-side post-cutover: only staff roles proceed.
      if (user.role !== "admin") {
        toast.error("This account does not have admin access");
        await logout();
        setLoading(false);
        return;
      }
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
      <div className="flex min-h-dvh items-center justify-center bg-bone text-mute">
        <p className="text-[0.7rem] font-semibold tracking-[0.2em] uppercase">Loading…</p>
      </div>
    );
  }

  return (
    <AuthLayout panel="workshop" headerLink={{ href: "/login", label: "Member login" }}>
      <section aria-label="Admin log in">
        <AuthHeading
          kicker="Staff only"
          title="Admin login."
          lead="Orders, production partners, pricing and payouts."
        />

        <form onSubmit={handleSubmit} className="mt-8 grid gap-5" noValidate>
          <div className="grid gap-2">
            <FieldLabel htmlFor="admin-email">Email</FieldLabel>
            <TextInput
              id="admin-email"
              type="email"
              name="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@email.com"
            />
          </div>

          <div className="grid gap-2">
            <FieldLabel htmlFor="admin-password">Password</FieldLabel>
            <PasswordInput
              id="admin-password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
            />
          </div>

          <BrandButton type="submit" disabled={loading} arrow={!loading} className="mt-2 w-full">
            {loading ? "Signing in…" : "Enter admin"}
          </BrandButton>
        </form>
      </section>
    </AuthLayout>
  );
}
