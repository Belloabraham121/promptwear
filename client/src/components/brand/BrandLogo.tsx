import Link from "next/link";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  href?: string | null;
  className?: string;
  /** Accessible name for the link/mark */
  label?: string;
  /**
   * `onLight` — ink wordmark on light UI (default).
   * `onDark` — bone wordmark on dark UI.
   */
  variant?: "onLight" | "onDark";
  /** Visual scale for nav / footer / auth */
  size?: "sm" | "md" | "lg";
};

const SIZE_CLASS = {
  sm: "text-[1.15rem]",
  md: "text-[1.35rem]",
  lg: "text-[1.9rem] sm:text-[2.3rem]",
} as const;

/** Font wordmark used in nav, auth, dashboard, and footer. */
export function BrandLogo({
  href = "/",
  className,
  label = "Driplab home",
  variant = "onLight",
  size = "sm",
}: BrandLogoProps) {
  const mark = (
    <span
      aria-hidden="true"
      className={cn(
        "font-heading font-extrabold lowercase leading-none tracking-[-0.05em]",
        SIZE_CLASS[size],
        variant === "onDark" ? "text-bone" : "text-ink",
        className,
      )}
    >
      driplab<span className="text-[#5a6b14]">.</span>
    </span>
  );

  if (href == null || href === "") {
    return (
      <span aria-label={label} className="inline-flex items-center">
        {mark}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className="inline-flex items-center transition-opacity hover:opacity-80"
      aria-label={label}
    >
      {mark}
    </Link>
  );
}

/**
 * Compact icon mark: the wordmark's "d." on an ink tile with a lime drip.
 * Used where the full wordmark doesn't fit, e.g. the collapsed sidebar.
 */
export function BrandMark({
  href = "/",
  label = "Driplab home",
  className,
}: {
  href?: string | null;
  label?: string;
  className?: string;
}) {
  const tile = (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-10 place-items-center bg-ink font-heading text-[1.45rem] leading-none font-extrabold tracking-[-0.06em] text-bone lowercase",
        className,
      )}
    >
      <span className="-mt-0.5">
        d<span className="text-lime">.</span>
      </span>
    </span>
  );

  if (href == null || href === "") {
    return (
      <span aria-label={label} className="inline-flex">
        {tile}
      </span>
    );
  }

  return (
    <Link href={href} aria-label={label} className="inline-flex transition-opacity hover:opacity-85">
      {tile}
    </Link>
  );
}
