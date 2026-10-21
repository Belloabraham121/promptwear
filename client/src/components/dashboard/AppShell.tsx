"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { useState } from "react";
import { BrandLogo, BrandMark } from "@/components/brand/BrandLogo";
import { Kicker } from "@/components/brand/ui";
import { Bone } from "@/components/dashboard/Skeletons";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
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
  // Logging out always asks first; the dialog runs onLogout on confirm.
  const [confirmLogout, setConfirmLogout] = useState(false);

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const initial = (userName.trim()[0] || "•").toUpperCase();

  return (
    <div className="min-h-dvh bg-bone font-sans text-ink">
      <div className="flex min-h-dvh w-full items-start">
        {/*
          Desktop sidebar. Collapsing animates the width down to an icon rail:
          the wordmark becomes the "d." mark and labels hide but stay readable
          to screen readers.
        */}
        <aside
          data-collapsed={collapsed || undefined}
          className={cn(
            "sticky top-0 hidden h-dvh shrink-0 flex-col overflow-hidden border-r border-ink/12 bg-paper transition-[width] duration-300 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none md:flex",
            collapsed ? "w-[4.5rem]" : "w-[16.5rem]",
          )}
        >
          <div
            className={cn(
              "flex gap-2 pt-5",
              collapsed ? "flex-col items-center px-0" : "items-center justify-between px-5",
            )}
          >
            {collapsed ? (
              <BrandMark href={brandHref} label={brandLabel} />
            ) : (
              <BrandLogo href={brandHref} size="md" label={brandLabel} />
            )}
            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!collapsed}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className={cn(
                "grid size-9 shrink-0 place-items-center text-mute transition-colors hover:bg-ink/5 hover:text-ink",
                collapsed && "mt-2",
              )}
            >
              {collapsed ? (
                <PanelLeftOpen size={18} strokeWidth={2} />
              ) : (
                <PanelLeftClose size={18} strokeWidth={2} />
              )}
            </button>
          </div>
          <Kicker
            className={cn(
              "mt-3 px-5 whitespace-nowrap text-olive transition-opacity duration-200",
              collapsed && "pointer-events-none h-0 opacity-0",
            )}
          >
            {eyebrow}
          </Kicker>

          <nav
            className={cn("flex flex-1 flex-col border-t border-ink/12", collapsed ? "mt-4" : "mt-8")}
            aria-label="Dashboard"
          >
            {nav.map((item, i) => {
              const Icon = item.icon;
              const active = isActive(item.href, item.exact);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "group flex items-center gap-3 border-b border-ink/12 py-3.5 text-[0.74rem] font-semibold tracking-[0.16em] whitespace-nowrap uppercase transition-colors",
                    collapsed ? "justify-center px-0" : "px-5",
                    active ? "bg-ink text-bone" : "text-ink hover:bg-ink/5",
                  )}
                >
                  <span
                    className={cn(
                      "w-5 text-[0.66rem] tabular-nums",
                      active ? "text-lime" : "text-mute group-hover:text-ink",
                      collapsed && "sr-only",
                    )}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className={cn("flex-1", collapsed && "sr-only")}>{item.label}</span>
                  <Icon
                    size={collapsed ? 18 : 16}
                    strokeWidth={2}
                    aria-hidden
                    className={active ? "text-lime" : "text-mute group-hover:text-ink"}
                  />
                </Link>
              );
            })}
          </nav>

          <div className={cn("border-t border-ink/12", collapsed ? "flex flex-col items-center gap-3 py-5" : "p-5")}>
            {userName ? (
              <div className="flex items-center gap-3" title={collapsed ? `${userName} · ${userEmail}` : undefined}>
                <span className="grid size-10 shrink-0 place-items-center bg-ink font-heading text-sm font-extrabold text-lime">
                  {initial}
                </span>
                <div className={cn("min-w-0 flex-1", collapsed && "sr-only")}>
                  <p className="truncate text-sm font-semibold">{userName}</p>
                  <p className="truncate text-xs text-mute">{userEmail}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3" aria-hidden>
                <Bone className="size-10" />
                {collapsed ? null : (
                  <div className="flex-1">
                    <Bone className="h-3.5 w-24" />
                    <Bone className="mt-1.5 h-3 w-32" />
                  </div>
                )}
              </div>
            )}
            {userMeta && !collapsed ? <Kicker className="mt-3 text-olive">{userMeta}</Kicker> : null}
            <button
              type="button"
              disabled={isLoggingOut}
              onClick={() => setConfirmLogout(true)}
              title={collapsed ? "Log out" : undefined}
              className={cn(
                "inline-flex items-center gap-1.5 text-[0.66rem] font-semibold tracking-[0.18em] whitespace-nowrap text-mute uppercase transition-colors hover:text-ink disabled:opacity-50",
                collapsed ? "grid size-9 place-items-center hover:bg-ink/5" : "mt-4 border-b border-current pb-0.5",
              )}
            >
              <LogOut size={collapsed ? 16 : 13} strokeWidth={2.25} aria-hidden />
              <span className={cn(collapsed && "sr-only")}>
                {isLoggingOut ? "Signing out…" : "Log out"}
              </span>
            </button>
          </div>
        </aside>

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobile top bar */}
          <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-ink/12 bg-bone/92 px-4 py-3 backdrop-blur md:hidden">
            <BrandLogo href={brandHref} size="sm" label={brandLabel} />
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              className="grid size-10 place-items-center border border-ink/20 text-ink"
            >
              {mobileOpen ? <X size={18} strokeWidth={2} /> : <Menu size={18} strokeWidth={2} />}
            </button>
          </header>

          {mobileOpen ? (
            <div className="border-b border-ink/12 bg-paper md:hidden">
              <nav className="flex flex-col" aria-label="Mobile dashboard">
                {nav.map((item, i) => {
                  const active = isActive(item.href, item.exact);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-baseline gap-4 border-b border-ink/10 px-4 py-3.5",
                        active ? "bg-ink text-bone" : "text-ink",
                      )}
                    >
                      <span className={cn("text-[0.66rem] font-semibold tabular-nums", active ? "text-lime" : "text-mute")}>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="font-heading text-xl font-extrabold tracking-[-0.03em]">
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
                <button
                  type="button"
                  disabled={isLoggingOut}
                  onClick={() => {
                    setMobileOpen(false);
                    setConfirmLogout(true);
                  }}
                  className="px-4 py-3.5 text-left text-[0.7rem] font-semibold tracking-[0.18em] text-mute uppercase disabled:opacity-50"
                >
                  {isLoggingOut ? "Signing out…" : "Log out"}
                </button>
              </nav>
            </div>
          ) : null}

          {/* Desktop meta bar */}
          <div className="hidden items-center justify-between gap-3 border-b border-ink/12 px-6 py-4 md:flex lg:px-10">
            <Kicker className="text-mute">{headerMeta}</Kicker>
            {headerAction}
          </div>

          <main className="min-w-0 flex-1 px-4 py-8 md:px-6 md:py-10 lg:px-10">{children}</main>
        </div>
      </div>

      <ConfirmDialog
        open={confirmLogout}
        kicker="Account"
        title="Log out?"
        description={
          userEmail ? (
            <>
              You’re signed in as <span className="font-semibold text-ink">{userEmail}</span>. You’ll
              need to log in again to continue.
            </>
          ) : (
            "You’ll need to log in again to continue."
          )
        }
        cancelLabel="Stay signed in"
        confirmLabel="Log out"
        confirming={isLoggingOut}
        onConfirm={onLogout}
        onCancel={() => setConfirmLogout(false)}
      />
    </div>
  );
}
