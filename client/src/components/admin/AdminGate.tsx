"use client";

import { PageHeader } from "@/components/dashboard/ui";
import { useAuth } from "@/providers/AuthProvider";

export function AdminGate({ children }: { children: React.ReactNode }) {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return <p className="text-sm text-[#c8c4b8]">Loading admin…</p>;
  }

  if (session?.role === "admin") {
    return <>{children}</>;
  }

  return (
    <div className="mx-auto max-w-md">
      <PageHeader
        title="Admin access"
        description="This area is restricted to admin accounts."
      />
      <div className="border border-[#f3f0e8]/12 p-5">
        <p className="text-sm text-[#c8c4b8]">
          Your account does not have admin privileges. Contact support if you
          believe this is an error.
        </p>
      </div>
    </div>
  );
}
