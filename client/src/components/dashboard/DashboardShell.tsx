"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Menu,
  Package,
  Palette,
  PenTool,
  UserRound,
  X,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useDashboard } from "@/components/dashboard/DashboardProvider";
import { AdminShell } from "@/components/admin/AdminShell";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { useAuth } from "@/providers/AuthProvider";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/designs", label: "Designs", icon: Palette },
  { href: "/dashboard/studio", label: "Studio", icon: PenTool },
  { href: "/dashboard/orders", label: "Orders", icon: Package },
  { href: "/dashboard/account", label: "Account", icon: UserRound },
] as const;

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, ready } = useDashboard();
  const { session, logout, isLoggingOut } = useAuth();
  const [open, setOpen] = useState(false);
  const isAdminUser = session?.role === "admin";

  // Canvas editor is a full-page experience (no sidebar / top chrome)
  const isStudioCanvas = /^\/dashboard\/studio\/[^/]+$/.test(pathname);
  const isAdminRoute = pathname.startsWith("/dashboard/admin");

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  if (isStudioCanvas) {
    return (
      <div className="min-h-dvh bg-[#070807] text-[#f3f0e8] font-[family-name:var(--font-body)]">
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
    <div className="min-h-screen bg-[#070807] text-[#f3f0e8] font-[family-name:var(--font-body)]">
      <div className="flex min-h-screen w-full">
        {/* Desktop sidebar — flush to the left edge */}
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-[#f3f0e8]/10 px-4 py-6 md:flex">
          <BrandLogo href="/" variant="onDark" size="sm" className="px-2" />
          <p className="mt-1 px-2 text-[0.65rem] uppercase tracking-[0.16em] text-[#c8c4b8]">
            Studio & orders
          </p>

          <nav className="mt-8 flex flex-1 flex-col gap-1" aria-label="Dashboard">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href, "exact" in item && item.exact);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm transition-colors",
                    active
                      ? "bg-[#d6ff3c] font-semibold text-[#070807]"
                      : "text-[#c8c4b8] hover:bg-[#f3f0e8]/6 hover:text-[#f3f0e8]",
                  )}
                >
                  <Icon size={16} strokeWidth={2.25} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto border-t border-[#f3f0e8]/10 px-2 pt-4">
            <p className="truncate text-sm font-medium">
              {ready ? user.name : "…"}
            </p>
            <p className="truncate text-xs text-[#c8c4b8]">
              {ready ? user.email : ""}
            </p>
            <button
              type="button"
              disabled={isLoggingOut}
              onClick={() => void logout().then(() => window.location.assign("/login"))}
              className="mt-3 text-xs font-semibold uppercase tracking-[0.08em] text-[#c8c4b8] transition hover:text-[#f3f0e8] disabled:opacity-50"
            >
              {isLoggingOut ? "Signing out…" : "Log out"}
            </button>
          </div>
        </aside>

        {/* Main */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[#f3f0e8]/10 bg-[#070807]/90 px-4 py-3 backdrop-blur md:px-6">
            <button
              type="button"
              className="grid size-10 place-items-center border border-[#f3f0e8]/20 text-[#f3f0e8] md:hidden"
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
            <BrandLogo
              href="/"
              variant="onDark"
              size="sm"
              className="md:hidden"
            />
            <div className="hidden text-xs uppercase tracking-[0.14em] text-[#c8c4b8] md:block">
              Design · Quote · Order
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard/studio"
                className="inline-flex items-center gap-1.5 bg-[#d6ff3c] px-3 py-2 text-xs font-bold uppercase tracking-[0.06em] text-[#070807] transition hover:bg-[#e2ff6a]"
              >
                New design
              </Link>
            </div>
          </header>

          {open ? (
            <div className="border-b border-[#f3f0e8]/10 bg-[#0c0e0c] px-3 py-3 md:hidden">
              <nav className="flex flex-col gap-1" aria-label="Mobile dashboard">
                {NAV.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(
                    item.href,
                    "exact" in item && item.exact,
                  );
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm",
                        active
                          ? "bg-[#d6ff3c] font-semibold text-[#070807]"
                          : "text-[#c8c4b8]",
                      )}
                    >
                      <Icon size={16} />
                      {item.label}
                    </Link>
                  );
                })}
                <button
                  type="button"
                  disabled={isLoggingOut}
                  onClick={() => {
                    setOpen(false);
                    void logout().then(() => window.location.assign("/login"));
                  }}
                  className="px-3 py-2.5 text-left text-sm text-[#c8c4b8] disabled:opacity-50"
                >
                  {isLoggingOut ? "Signing out…" : "Log out"}
                </button>
              </nav>
            </div>
          ) : null}

          <main className="min-w-0 flex-1 px-4 py-6 md:px-6 md:py-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
