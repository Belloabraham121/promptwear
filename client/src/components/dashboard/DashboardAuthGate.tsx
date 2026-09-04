"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/providers/AuthProvider";

export function DashboardAuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { session, isLoading } = useAuth();
  const isAdminRoute = pathname.startsWith("/dashboard/admin");

  useEffect(() => {
    if (isLoading || session === undefined) return;

    if (session === null) {
      router.replace(isAdminRoute ? "/admin/login" : "/login");
      return;
    }

    // Admins stay in the admin portal; creators cannot use admin routes.
    if (session.role === "admin" && !isAdminRoute) {
      router.replace("/dashboard/admin");
    }
  }, [isLoading, session, router, pathname, isAdminRoute]);

  if (
    isLoading ||
    session === undefined ||
    session === null ||
    (session.role === "admin" && !isAdminRoute)
  ) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#070807] text-[#c8c4b8]">
        <p className="text-sm tracking-[0.08em] uppercase">Loading…</p>
      </div>
    );
  }

  return <>{children}</>;
}
