"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Boxes,
  Menu,
  Package,
  Percent,
  Shield,
  Truck,
  X,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useDashboard } from "@/components/dashboard/DashboardProvider";

const NAV = [
  { href: "/dashboard/admin", label: "Overview", icon: Shield, exact: true },
  { href: "/dashboard/admin/orders", label: "Orders", icon: Package },
  { href: "/dashboard/admin/products", label: "Products", icon: Boxes },
  { href: "/dashboard/admin/vendors", label: "Vendors", icon: Truck },
  { href: "/dashboard/admin/profit", label: "Pricing", icon: Percent },
  { href: "/dashboard/admin/analytics", label: "Analytics", icon: BarChart3 },
] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, ready } = useDashboard();
  const [open, setOpen] = useState(false);

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div className="min-h-screen bg-[#070807] text-[#f3f0e8] font-[family-name:var(--font-body)]">
      <div className="flex min-h-screen w-full">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-[#f3f0e8]/10 px-4 py-6 md:flex">
          <Link
            href="/"
            className="px-2 font-[family-name:var(--font-display)] text-lg font-extrabold lowercase tracking-[-0.04em]"
          >
            promptwear
          </Link>
          <p className="mt-1 px-2 text-[0.65rem] uppercase tracking-[0.16em] text-[#d6ff3c]">
            Admin
          </p>

          <nav className="mt-8 flex flex-1 flex-col gap-1" aria-label="Admin">
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

          <div className="mt-auto space-y-3 border-t border-[#f3f0e8]/10 px-2 pt-4">
            <Link
              href="/dashboard"
              className="block text-xs font-semibold uppercase tracking-[0.08em] text-[#c8c4b8] underline-offset-4 hover:text-[#f3f0e8] hover:underline"
            >
              ← Creator dashboard
            </Link>
            <div>
              <p className="truncate text-sm font-medium">
                {ready ? user.name : "…"}
              </p>
              <p className="truncate text-xs text-[#c8c4b8]">
                {ready ? user.email : ""}
              </p>
            </div>
          </div>
        </aside>

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
            <Link
              href="/dashboard/admin"
              className="font-[family-name:var(--font-display)] text-base font-extrabold lowercase tracking-[-0.04em] md:hidden"
            >
              admin
            </Link>
            <div className="hidden text-xs uppercase tracking-[0.14em] text-[#c8c4b8] md:block">
              Orders · Catalog · Vendors · Margin
            </div>
            <Link
              href="/dashboard"
              className="text-xs font-semibold uppercase tracking-[0.08em] text-[#c8c4b8] hover:text-[#f3f0e8]"
            >
              Exit admin
            </Link>
          </header>

          {open ? (
            <div className="border-b border-[#f3f0e8]/10 bg-[#0c0e0c] px-3 py-3 md:hidden">
              <nav className="flex flex-col gap-1" aria-label="Mobile admin">
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
                <Link
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                  className="px-3 py-2.5 text-sm text-[#c8c4b8]"
                >
                  ← Creator dashboard
                </Link>
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
