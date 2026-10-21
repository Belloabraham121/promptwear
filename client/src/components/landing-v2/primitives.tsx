import Link from "next/link";
import { getImageProps } from "next/image";
import { ArrowUpRight } from "lucide-react";
import { v2Image } from "@/components/landing-v2/data";
import { cn } from "@/lib/utils";

export const padX = "px-[clamp(1.15rem,4vw,3.5rem)]";

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
 * Headline whose lines slide up on scroll. Each string in `lines` is one line,
 * masked so the motion reads like print being revealed.
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

export function InkButton({
  href,
  children,
  className,
  tone = "ink",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  tone?: "ink" | "lime" | "bone";
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group/btn inline-flex items-center justify-center gap-2.5 px-7 py-4 text-[0.78rem] font-bold tracking-[0.16em] uppercase transition-colors duration-300",
        tone === "ink" && "bg-[#070807] text-[#f3f0e8] hover:bg-[#d6ff3c] hover:text-[#070807]",
        tone === "lime" && "bg-[#d6ff3c] text-[#070807] hover:bg-[#f3f0e8]",
        tone === "bone" && "bg-[#f3f0e8] text-[#070807] hover:bg-[#d6ff3c]",
        className,
      )}
    >
      {children}
      <ArrowUpRight
        size={16}
        strokeWidth={2.25}
        className="transition-transform duration-300 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5"
      />
    </Link>
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

/**
 * Full-bleed campaign photo with separate desktop (16:9) and mobile (9:16)
 * crops. The inner wrapper is what the scroll parallax moves.
 */
export function CampaignImage({
  name,
  alt,
  className,
  imgClassName,
}: {
  name: "street" | "campus" | "night" | "studio";
  alt: string;
  className?: string;
  imgClassName?: string;
}) {
  const common = { alt, sizes: "100vw" };
  const {
    props: { srcSet: desktop },
  } = getImageProps({
    ...common,
    width: 1672,
    height: 941,
    src: v2Image(`campaign-${name}-desktop.jpg`),
  });
  const {
    props: { srcSet: mobile, ...rest },
  } = getImageProps({
    ...common,
    width: 941,
    height: 1672,
    src: v2Image(`campaign-${name}-mobile.jpg`),
  });

  return (
    <div data-parallax className={cn("absolute inset-0 overflow-hidden", className)}>
      <picture data-parallax-media className="absolute inset-[-8%_0] block">
        <source media="(min-width: 768px)" srcSet={desktop} />
        <source srcSet={mobile} />
        <img {...rest} alt={alt} className={cn("size-full object-cover", imgClassName)} />
      </picture>
    </div>
  );
}
