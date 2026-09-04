import Link from "next/link";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  href?: string;
  className?: string;
  /** Accessible name for the link/mark */
  label?: string;
};

/** Shared Driplap wordmark used in nav, auth, and footer. */
export function BrandLogo({
  href = "/",
  className,
  label = "Driplap home",
}: BrandLogoProps) {
  const mark = (
    <span
      className={cn(
        "font-heading text-[1.05rem] font-bold tracking-[-0.04em] lowercase",
        className,
      )}
    >
      driplap
    </span>
  );

  if (!href) {
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
