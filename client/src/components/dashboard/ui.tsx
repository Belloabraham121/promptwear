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
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-[-0.04em] text-[#0b1f1c] md:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-xl text-sm text-[#52706a]">{description}</p>
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
    <article className="rounded-2xl border border-[#0b1f1c]/10 bg-white p-5 shadow-[0_1px_2px_rgba(11,31,28,0.05)]">
      <p className="text-[0.68rem] uppercase tracking-[0.16em] text-[#52706a]">
        {label}
      </p>
      <p className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold tracking-[-0.04em] text-[#0b1f1c]">
        {value}
      </p>
      {hint ? <p className="mt-2 text-xs text-[#52706a]">{hint}</p> : null}
    </article>
  );
}

export function StatusPill({ status }: { status: OrderStatus }) {
  const tone =
    status === "delivered" || status === "order_received" || status === "paid"
      ? "bg-[#5a6b14]/15 text-[#3f4d0e]"
      : status === "cancelled" || status === "refunded"
        ? "bg-red-600/10 text-red-700"
        : status === "printing" ||
            status === "in_production" ||
            status === "shipped" ||
            status === "quality_check" ||
            status === "packaging" ||
            status === "production_assigned" ||
            status === "design_confirmed"
          ? "bg-[#0b1f1c]/8 text-[#0b1f1c]"
          : "bg-[#0b1f1c]/5 text-[#52706a]";

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.12em]",
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
        "inline-flex items-center justify-center gap-2 rounded-full bg-[#0b1f1c] px-4 py-2.5 text-xs font-bold uppercase tracking-[0.06em] text-white transition hover:bg-[#14322d]",
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function LimeLink({
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
        "inline-flex items-center justify-center gap-2 rounded-full bg-[#d6ff3c] px-4 py-2.5 text-xs font-bold uppercase tracking-[0.06em] text-[#070807] transition hover:bg-[#e2ff6a]",
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
  dark?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#52706a] underline-offset-4 hover:text-[#0b1f1c] hover:underline",
        className,
      )}
    >
      {children}
    </Link>
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
    <div className="rounded-2xl border border-dashed border-[#0b1f1c]/20 bg-white px-6 py-14 text-center">
      <h2 className="font-[family-name:var(--font-display)] text-xl font-bold tracking-[-0.03em] text-[#0b1f1c]">
        {title}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-[#52706a]">{body}</p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}
