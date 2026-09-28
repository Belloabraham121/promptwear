import type { Metadata } from "next";
import { AuthPage } from "@/components/auth/AuthPage";

export const metadata: Metadata = {
  title: "Log in — Driblab",
  description:
    "Sign in or create a Driblab account with Google or email. Keep your designs and orders in one place.",
};

type LoginPageProps = {
  searchParams: Promise<{ mode?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const initialMode = params.mode === "signup" ? "signup" : "signin";

  return <AuthPage initialMode={initialMode} />;
}
