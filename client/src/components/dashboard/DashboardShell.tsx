"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Palette,
  PenTool,
  Plus,
  UserRound,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { useDashboard } from "@/components/dashboard/DashboardProvider";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAuth } from "@/providers/AuthProvider";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/designs", label: "Designs", icon: Palette },
  { href: "/dashboard/studio", label: "Studio", icon: PenTool },
  { href: "/dashboard/orders", label: "Orders", icon: Package },
  { href: "/dashboard/team", label: "Team", icon: Users },
  { href: "/dashboard/account", label: "Account", icon: UserRound },
] as const;

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, ready } = useDashboard();
  const { session, logout, isLoggingOut } = useAuth();
  const isAdminUser = session?.role === "admin";

  // Studio chat app is a full-page experience (owns its own left chat list)
  const isStudioRoute =
    pathname === "/dashboard/studio" ||
    pathname.startsWith("/dashboard/studio/");
  const isAdminRoute = pathname.startsWith("/dashboard/admin");

  if (isStudioRoute) {
    return (
      <div className="min-h-dvh bg-[#070807] font-[family-name:var(--font-body)] text-[#f3f0e8]">
        {children}
      </div>
    );
  }

  // Admin chrome only for admins. Always render children so AdminGate can redirect.
  if (isAdminRoute) {
    if (!isAdminUser) {
      return <>{children}</>;
    }
    return <AdminShell>{children}</AdminShell>;
  }

  return (
    <AppShell
      nav={NAV}
      eyebrow="Studio & orders"
      brandHref="/"
      brandLabel="Driblab home"
      headerMeta="Design · Quote · Order"
      headerAction={
        <Link
          href="/dashboard/studio"
          className="inline-flex items-center gap-1.5 rounded-full bg-[#d6ff3c] px-4 py-2 text-xs font-bold tracking-[0.06em] text-[#070807] uppercase transition hover:bg-[#e2ff6a]"
        >
          <Plus size={14} strokeWidth={2.5} />
          New design
        </Link>
      }
      userName={ready ? user.name : "…"}
      userEmail={ready ? user.email : ""}
      onLogout={() => void logout().then(() => window.location.assign("/login"))}
      isLoggingOut={isLoggingOut}
    >
      {children}
    </AppShell>
  );
}
