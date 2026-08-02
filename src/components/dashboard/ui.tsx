import Link from "next/link";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/lib/dashboard/types";
import { STATUS_LABELS } from "@/lib/dashboard/types";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-[-0.04em] md:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-xl text-sm text-[#c8c4b8]">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <article className="border border-[#f3f0e8]/12 bg-[#0c0e0c] p-5">
      <p className="text-[0.68rem] uppercase tracking-[0.16em] text-[#c8c4b8]">
        {label}
      </p>
      <p className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold tracking-[-0.04em]">
        {value}
      </p>
      {hint ? <p className="mt-2 text-xs text-[#c8c4b8]">{hint}</p> : null}
    </article>
  );
}

export function StatusPill({ status }: { status: OrderStatus }) {
  const tone =
    status === "delivered" || status === "paid"
      ? "bg-[#d6ff3c]/15 text-[#d6ff3c]"
      : status === "cancelled"
        ? "bg-red-500/15 text-red-300"
        : status === "in_production" || status === "shipped"
          ? "bg-[#f3f0e8]/12 text-[#f3f0e8]"
          : "bg-[#f3f0e8]/8 text-[#c8c4b8]";

  return (
    <span
      className={cn(
        "inline-flex px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.12em]",
        tone,
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

export function PrimaryLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center justify-center gap-2 bg-[#d6ff3c] px-4 py-2.5 text-xs font-bold uppercase tracking-[0.06em] text-[#070807] transition hover:bg-[#e2ff6a]",
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function GhostLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#c8c4b8] underline-offset-4 hover:text-[#f3f0e8] hover:underline",
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function DesignSwatch({
  color,
  title,
  className,
}: {
  color: string;
  title: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative aspect-[4/5] overflow-hidden border border-[#f3f0e8]/10",
        className,
      )}
      style={{
        background: `linear-gradient(160deg, #141714 0%, ${color}33 45%, #0c0e0c 100%)`,
      }}
    >
      <div
        className="absolute inset-[18%_22%_28%] rounded-sm"
        style={{ backgroundColor: color === "#f3f0e8" ? "#2a3028" : color }}
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#070807] to-transparent p-3">
        <p className="truncate text-sm font-medium">{title}</p>
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="border border-dashed border-[#f3f0e8]/20 px-6 py-14 text-center">
      <h2 className="font-[family-name:var(--font-display)] text-xl font-bold tracking-[-0.03em]">
        {title}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-[#c8c4b8]">{body}</p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}
