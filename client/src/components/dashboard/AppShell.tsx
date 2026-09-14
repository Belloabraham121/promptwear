"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useState } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export type ShellNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

export function AppShell({
  nav,
  eyebrow,
  brandHref,
  brandLabel,
  headerMeta,
  headerAction,
  userName,
  userEmail,
  userMeta,
  onLogout,
  isLoggingOut,
  children,
}: {
  nav: readonly ShellNavItem[];
  eyebrow: string;
  brandHref: string;
  brandLabel: string;
  headerMeta: string;
  headerAction?: React.ReactNode;
  userName: string;
  userEmail: string;
  userMeta?: string;
  onLogout: () => void;
  isLoggingOut: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const initial = (userName.trim()[0] || "•").toUpperCase();

  return (
    <div className="min-h-dvh bg-[#edf4f1] font-[family-name:var(--font-body)] text-[#0b1f1c]">
      <div className="flex min-h-dvh w-full items-start">
        {/* Detached desktop sidebar */}
        {!collapsed ? (
          <aside className="sticky top-3 ml-3 hidden h-[calc(100dvh-1.5rem)] w-[17rem] shrink-0 flex-col rounded-2xl border border-[#0b1f1c]/10 bg-white p-4 shadow-[0_8px_30px_rgba(11,31,28,0.07)] md:flex">
            <div className="flex items-center justify-between gap-2">
              <BrandLogo href={brandHref} size="sm" label={brandLabel} />
              <button
                type="button"
                onClick={() => setCollapsed(true)}
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
                className="grid size-9 shrink-0 place-items-center rounded-xl text-[#52706a] transition hover:bg-[#0b1f1c]/5 hover:text-[#0b1f1c]"
              >
                <PanelLeftClose size={18} strokeWidth={2} />
              </button>
            </div>
            <p className="mt-1 px-2 text-[0.65rem] tracking-[0.16em] text-[#52706a] uppercase">
              {eyebrow}
            </p>

            <nav className="mt-6 flex flex-1 flex-col gap-1" aria-label="Dashboard">
              {nav.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href, item.exact);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-colors",
                      active
                        ? "bg-[#0b1f1c] font-semibold text-white"
                        : "text-[#3d5450] hover:bg-[#0b1f1c]/5 hover:text-[#0b1f1c]",
                    )}
                  >
                    <Icon size={17} strokeWidth={2.25} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto rounded-xl border border-[#0b1f1c]/10 bg-[#edf4f1] p-3">
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#0b1f1c] text-sm font-bold text-white">
                  {initial}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{userName}</p>
                  <p className="truncate text-xs text-[#52706a]">{userEmail}</p>
                </div>
              </div>
              {userMeta ? (
                <p className="mt-2 px-1 text-[0.65rem] tracking-[0.12em] text-[#52706a] uppercase">
                  {userMeta}
                </p>
              ) : null}
              <button
                type="button"
                disabled={isLoggingOut}
                onClick={onLogout}
                className="mt-2 inline-flex items-center gap-1.5 px-1 text-xs font-semibold tracking-[0.08em] text-[#52706a] uppercase transition hover:text-[#0b1f1c] disabled:opacity-50"
              >
                <LogOut size={13} strokeWidth={2.25} />
                {isLoggingOut ? "Signing out…" : "Log out"}
              </button>
            </div>
          </aside>
        ) : (
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            aria-label="Expand sidebar"
            title="Expand sidebar"
            className="sticky top-3 mt-3 ml-3 hidden size-11 shrink-0 place-items-center rounded-2xl border border-[#0b1f1c]/10 bg-white text-[#52706a] shadow-[0_8px_30px_rgba(11,31,28,0.07)] transition hover:text-[#0b1f1c] md:grid"
          >
            <PanelLeftOpen size={19} strokeWidth={2} />
          </button>
        )}

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobile top bar */}
          <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-[#0b1f1c]/10 bg-[#edf4f1]/92 px-4 py-3 backdrop-blur md:hidden">
            <BrandLogo href={brandHref} size="sm" label={brandLabel} />
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              className="grid size-10 place-items-center rounded-xl border border-[#0b1f1c]/15 bg-white text-[#0b1f1c]"
            >
              <PanelLeftOpen size={18} strokeWidth={2} />
            </button>
          </header>

          {mobileOpen ? (
            <div className="border-b border-[#0b1f1c]/10 bg-white px-3 py-3 md:hidden">
              <nav className="flex flex-col gap-1" aria-label="Mobile dashboard">
                {nav.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href, item.exact);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm",
                        active
                          ? "bg-[#0b1f1c] font-semibold text-white"
                          : "text-[#3d5450]",
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
                    setMobileOpen(false);
                    onLogout();
                  }}
                  className="px-3 py-2.5 text-left text-sm text-[#52706a] disabled:opacity-50"
                >
                  {isLoggingOut ? "Signing out…" : "Log out"}
                </button>
              </nav>
            </div>
          ) : null}

          {/* Desktop meta bar */}
          <div className="hidden items-center justify-between gap-3 px-6 pt-5 md:flex lg:px-8">
            <p className="text-xs tracking-[0.14em] text-[#52706a] uppercase">
              {headerMeta}
            </p>
            {headerAction}
          </div>

          <main className="min-w-0 flex-1 px-4 py-5 md:px-6 md:py-6 lg:px-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
