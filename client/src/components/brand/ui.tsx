import Link from "next/link";
import { forwardRef } from "react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shared Driplab building blocks: the editorial look from the landing page
 * (masthead labels, square buttons, underlined text links, hairline fields),
 * for use across auth, dashboard, studio and admin.
 */

/** Small uppercase masthead label: "01 — Trending now". */
export function Kicker({
  index,
  children,
  className,
}: {
  index?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "m-0 flex items-center gap-3 text-[0.68rem] font-semibold tracking-[0.22em] uppercase",
        className,
      )}
    >
      {index ? <span className="tabular-nums">{index}</span> : null}
      {index ? <span aria-hidden className="h-px w-8 bg-current opacity-40" /> : null}
      <span>{children}</span>
    </p>
  );
}

/**
 * Display headline, one string per line. On the landing page each line slides
 * up on scroll (via data-split/data-line); elsewhere it is plain markup.
 */
export function SplitHeading({
  lines,
  as: Tag = "h2",
  className,
}: {
  lines: React.ReactNode[];
  as?: "h1" | "h2" | "h3";
  className?: string;
}) {
  return (
    <Tag data-split className={cn("m-0 font-heading", className)}>
      {lines.map((line, i) => (
        <span key={i} className="block overflow-hidden pb-[0.06em]">
          <span data-line className="block">
            {line}
          </span>
        </span>
      ))}
    </Tag>
  );
}

export type BrandTone = "ink" | "lime" | "bone";

/** Classes for the square uppercase button, shared by links and buttons. */
export function brandButtonClass(tone: BrandTone = "ink", className?: string) {
  return cn(
    "group/btn inline-flex items-center justify-center gap-2.5 px-7 py-4 text-[0.78rem] font-bold tracking-[0.16em] uppercase transition-colors duration-300 disabled:pointer-events-none disabled:opacity-55",
    tone === "ink" && "bg-ink text-bone hover:bg-lime hover:text-ink",
    tone === "lime" && "bg-lime text-ink hover:bg-bone",
    tone === "bone" && "bg-bone text-ink hover:bg-lime",
    className,
  );
}

function ButtonArrow() {
  return (
    <ArrowUpRight
      size={16}
      strokeWidth={2.25}
      className="transition-transform duration-300 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover/btn:translate-0"
    />
  );
}

/** Square brand button rendered as a link. */
export function InkButton({
  href,
  children,
  className,
  tone = "ink",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  tone?: BrandTone;
}) {
  return (
    <Link href={href} className={brandButtonClass(tone, className)}>
      {children}
      <ButtonArrow />
    </Link>
  );
}

/** Square brand button rendered as a <button> (forms, actions). */
export function BrandButton({
  tone = "ink",
  arrow = true,
  className,
  children,
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: BrandTone; arrow?: boolean }) {
  return (
    <button type={type} className={brandButtonClass(tone, className)} {...props}>
      {children}
      {arrow ? <ButtonArrow /> : null}
    </button>
  );
}

export function TextLink({
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
        "inline-flex items-center gap-1.5 border-b border-current pb-1 text-[0.72rem] font-semibold tracking-[0.18em] uppercase transition-opacity hover:opacity-60",
        className,
      )}
    >
      {children}
      <ArrowUpRight size={14} strokeWidth={2.25} />
    </Link>
  );
}

/** Uppercase field label. */
export function FieldLabel({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("text-[0.66rem] font-semibold tracking-[0.2em] text-mute uppercase", className)}
      {...props}
    />
  );
}

/** Square paper input with a hairline border that turns ink on focus. */
export const TextInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function TextInput({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full border border-ink/15 bg-paper px-4 py-3.5 text-[1rem] text-ink outline-none transition-colors placeholder:text-mute/60 focus:border-ink focus-visible:ring-2 focus-visible:ring-lime/60",
          className,
        )}
        {...props}
      />
    );
  },
);

/** Hairline divider with an optional centred label ("or with email"). */
export function Rule({ label, className }: { label?: string; className?: string }) {
  if (!label) return <hr className={cn("m-0 h-px border-0 bg-ink/12", className)} />;
  return (
    <div
      className={cn(
        "flex items-center gap-4 text-[0.66rem] font-semibold tracking-[0.2em] text-mute uppercase",
        className,
      )}
    >
      <span className="h-px flex-1 bg-ink/12" />
      {label}
      <span className="h-px flex-1 bg-ink/12" />
    </div>
  );
}
