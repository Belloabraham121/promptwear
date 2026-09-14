"use client";

import { useRouter } from "next/navigation";
import {
  BarChart3,
  Boxes,
  Package,
  Percent,
  Shield,
  Truck,
} from "lucide-react";
import { AdminUserSkeleton } from "@/components/admin/AdminSkeleton";
import { AppShell } from "@/components/dashboard/AppShell";
import { useAuth } from "@/providers/AuthProvider";

const NAV = [
  { href: "/dashboard/admin", label: "Overview", icon: Shield, exact: true },
  { href: "/dashboard/admin/orders", label: "Orders", icon: Package },
  { href: "/dashboard/admin/products", label: "Products", icon: Boxes },
  { href: "/dashboard/admin/vendors", label: "Vendors", icon: Truck },
  { href: "/dashboard/admin/profit", label: "Pricing", icon: Percent },
  { href: "/dashboard/admin/analytics", label: "Analytics", icon: BarChart3 },
] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { session, isLoading, logout, isLoggingOut } = useAuth();

  async function handleLogout() {
    await logout();
    router.replace("/admin/login");
  }

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-[#f3f0e8] px-4 py-6 md:px-6">
        <AdminUserSkeleton />
      </div>
    );
  }

  // Always render children when session is missing so AdminGate can redirect.
  if (!session) {
    return <>{children}</>;
  }

  return (
    <AppShell
      nav={NAV}
      eyebrow="Admin"
      brandHref="/dashboard/admin"
      brandLabel="Driplap admin"
      headerMeta="Orders · Catalog · Vendors · Margin"
      userName={session.name}
      userEmail={session.email}
      userMeta={session.role}
      onLogout={() => void handleLogout()}
      isLoggingOut={isLoggingOut}
    >
      {children}
    </AppShell>
  );
}
