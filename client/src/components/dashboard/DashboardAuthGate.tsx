"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/providers/AuthProvider";

export function DashboardAuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { session, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && session === null) {
      router.replace("/login");
    }
  }, [isLoading, session, router]);

  if (isLoading || session === null) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#070807] text-[#c8c4b8]">
        <p className="text-sm tracking-[0.08em] uppercase">Loading…</p>
      </div>
    );
  }

  return <>{children}</>;
}
