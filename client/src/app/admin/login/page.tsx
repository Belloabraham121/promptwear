import type { Metadata } from "next";
import { AdminLoginPage } from "@/components/auth/AdminLoginPage";

export const metadata: Metadata = {
  title: "Admin login — Driblab",
  description: "Sign in to the Driblab admin console.",
  robots: { index: false, follow: false },
};

export default function AdminLoginRoute() {
  return <AdminLoginPage />;
}
