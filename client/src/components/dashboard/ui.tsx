import Image from "next/image";
import Link from "next/link";
import { Kicker } from "@/components/brand/ui";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/lib/dashboard/types";
import { STATUS_LABELS } from "@/lib/dashboard/types";

export function PageHeader({
  title,
  description,
  action,
  kicker,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  /** Small masthead label above the title, e.g. "Your studio". */
  kicker?: string;
}) {
  return (
    <div className="mb-10 flex flex-wrap items-end justify-between gap-6 border-b border-ink pb-6">
      <div>
        {kicker ? <Kicker className="mb-4 text-olive">{kicker}</Kicker> : null}
        <h1
          className={cn(
            "m-0 font-heading leading-[0.92] font-extrabold tracking-[-0.055em] text-ink",
            // IDs and other long single tokens (order IDs) get a smaller size and may break.
            !title.includes(" ") && title.length > 14
              ? "text-[clamp(1.4rem,2.6vw,2.2rem)] break-all"
              : "text-[clamp(2.4rem,5vw,4rem)]",
          )}
        >
          {title}
        </h1>
        {description ? (
          <p className="mt-4 mb-0 max-w-xl text-[0.95rem] leading-[1.55] text-mute">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

/** Numbered section title with an optional link on the right. */
export function SectionHeading({
  index,
  title,
  action,
}: {
  index: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4 border-b border-ink/12 pb-4 [&>a]:whitespace-nowrap">
      <div className="flex items-baseline gap-4">
        <span className="text-[0.68rem] font-semibold tracking-[0.22em] text-olive tabular-nums">
          {index}
        </span>
        <h2 className="m-0 font-heading text-[1.3rem] leading-none font-extrabold tracking-[-0.04em] whitespace-nowrap text-ink sm:text-[1.6rem]">
          {title}
        </h2>
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
    <article className="border border-ink/12 bg-paper p-5">
      <Kicker className="text-mute">{label}</Kicker>
      <p
        className={cn(
          "mt-4 mb-0 font-heading leading-none font-extrabold tracking-[-0.05em] whitespace-nowrap text-ink tabular-nums",
          // Long values (e.g. "₦7,217,459") step down so they stay on one line.
          String(value).length > 7 ? "text-[clamp(1.15rem,1.55vw,1.75rem)]" : "text-[2.6rem]",
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-3 mb-0 text-xs text-mute">{hint}</p> : null}
    </article>
  );
}

export function StatusPill({ status }: { status: OrderStatus }) {
  const tone =
    status === "delivered" || status === "order_received" || status === "paid"
      ? "bg-lime text-ink"
      : status === "cancelled" || status === "refunded"
        ? "bg-red-600/10 text-red-700"
        : status === "printing" ||
            status === "in_production" ||
            status === "shipped" ||
            status === "quality_check" ||
            status === "packaging" ||
            status === "production_assigned" ||
            status === "design_confirmed"
          ? "bg-ink text-bone"
          : "bg-sand text-mute";

  return (
    <span
      className={cn(
        "inline-flex px-2 py-1 text-[0.62rem] font-semibold tracking-[0.16em] uppercase",
        tone,
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

const smallButton =
  "inline-flex items-center justify-center gap-2 px-4 py-2.5 text-[0.7rem] font-bold tracking-[0.16em] uppercase transition-colors";

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
    <Link href={href} className={cn(smallButton, "bg-ink text-bone hover:bg-lime hover:text-ink", className)}>
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
    <Link href={href} className={cn(smallButton, "bg-lime text-ink hover:bg-ink hover:text-lime", className)}>
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
        "inline-flex items-center gap-2 border-b border-current pb-0.5 text-[0.68rem] font-semibold tracking-[0.18em] text-mute uppercase transition-colors hover:text-ink",
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
    <div className="border border-ink/12 bg-paper px-6 py-16 text-center">
      <Image
        src="/landing/v2/hero-cutout-02.png"
        alt=""
        width={120}
        height={128}
        className="mx-auto h-auto w-24 drop-shadow-[0_14px_18px_rgba(7,8,7,0.18)]"
      />
      <h2 className="mt-5 mb-0 font-heading text-[1.6rem] font-extrabold tracking-[-0.04em] text-ink">
        {title}
      </h2>
      <p className="mx-auto mt-3 mb-0 max-w-md text-[0.92rem] leading-[1.55] text-mute">{body}</p>
      {action ? <div className="mt-7 flex justify-center">{action}</div> : null}
    </div>
  );
}
