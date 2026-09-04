import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  href?: string | null;
  className?: string;
  /** Accessible name for the link/mark */
  label?: string;
  /**
   * `onLight` — black mark on light UI (default).
   * `onDark` — inverted so the mark reads light on dark UI.
   */
  variant?: "onLight" | "onDark";
  /** Visual scale for nav / footer / auth */
  size?: "sm" | "md" | "lg";
};

const SIZE_CLASS = {
  sm: "h-8 w-auto max-w-[9.5rem]",
  md: "h-10 w-auto max-w-[11rem]",
  lg: "h-14 w-auto max-w-[18rem] sm:h-16",
} as const;

/** Shared Driplab logo used in nav, auth, dashboard, and footer. */
export function BrandLogo({
  href = "/",
  className,
  label = "Driplab home",
  variant = "onLight",
  size = "sm",
}: BrandLogoProps) {
  const mark = (
    <Image
      src="/brand/driplab-logo.jpg"
      alt="Driplab"
      width={240}
      height={160}
      priority={size !== "lg"}
      className={cn(
        SIZE_CLASS[size],
        "object-contain object-left",
        variant === "onDark" && "rounded-sm invert",
        className,
      )}
    />
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
