"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { AdminGateSkeleton } from "@/components/admin/AdminSkeleton";
import { useAuth } from "@/providers/AuthProvider";

export function AdminGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { session, isLoading } = useAuth();
  const isAdmin = session?.role === "admin";

  useEffect(() => {
    if (isLoading) return;
    if (!session) {
      router.replace("/admin/login");
      return;
    }
    if (!isAdmin) {
      router.replace("/dashboard");
    }
  }, [isAdmin, isLoading, router, session]);

  if (isLoading || session === undefined) {
    return <AdminGateSkeleton />;
  }

  if (!session || !isAdmin) {
    return <AdminGateSkeleton />;
  }

  return <>{children}</>;
}
