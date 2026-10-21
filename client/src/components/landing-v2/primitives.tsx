import { getImageProps } from "next/image";
import { v2Image } from "@/components/landing-v2/data";
import { cn } from "@/lib/utils";

// Shared brand pieces live in components/brand/ui; re-exported for the landing page.
export { InkButton, Kicker, SplitHeading, TextLink } from "@/components/brand/ui";

export const padX = "px-[clamp(1.15rem,4vw,3.5rem)]";

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
