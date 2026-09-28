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
  label = "Driblab home",
  variant = "onLight",
  size = "sm",
}: BrandLogoProps) {
  const mark = (
    <span
      aria-hidden="true"
      className={cn(
        "font-heading font-extrabold lowercase leading-none tracking-[-0.05em]",
        SIZE_CLASS[size],
        variant === "onDark" ? "text-[#f3f0e8]" : "text-[#0b1f1c]",
        className,
      )}
    >
      driblab<span className="text-[#5a6b14]">.</span>
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
