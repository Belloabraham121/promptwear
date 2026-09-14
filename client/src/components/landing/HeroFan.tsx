"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

type FanCard = {
  src: string;
  alt: string;
  /** Card backdrop tint behind the transparent cutout. */
  tint: string;
  rotate: string;
  lift: string;
};

const CARDS: FanCard[] = [
  {
    src: "/landing/cutouts/landing-tee-campus.png",
    alt: "Lime campus tee, background removed",
    tint: "bg-[#070807]",
    rotate: "md:-rotate-[9deg] -rotate-[7deg]",
    lift: "md:translate-y-6 translate-y-3",
  },
  {
    src: "/landing/cutouts/landing-hero-2.png",
    alt: "Black Icarus polo with gold embroidery, background removed",
    tint: "bg-white",
    rotate: "md:-rotate-[5deg] -rotate-[4deg]",
    lift: "md:translate-y-2 translate-y-1",
  },
  {
    src: "/landing/cutouts/landing-tee-oversized.png",
    alt: "Black oversized tee, background removed",
    tint: "bg-[#e9e4d6]",
    rotate: "md:-rotate-[2deg] -rotate-[1deg]",
    lift: "",
  },
  {
    src: "/landing/cutouts/landing-hero-1.png",
    alt: "Black dragon polo, background removed",
    tint: "bg-white",
    rotate: "md:rotate-[2deg] rotate-[1deg]",
    lift: "",
  },
  {
    src: "/landing/cutouts/landing-hero-editor.png",
    alt: "Cream embroidered Opium polo front, background removed",
    tint: "bg-[#070807]",
    rotate: "md:rotate-[5deg] rotate-[4deg]",
    lift: "md:translate-y-2 translate-y-1",
  },
  {
    src: "/landing/cutouts/landing-hero-life.png",
    alt: "Cream embroidered Opium polo back, background removed",
    tint: "bg-[#e9e4d6]",
    rotate: "md:rotate-[9deg] rotate-[7deg]",
    lift: "md:translate-y-6 translate-y-3",
  },
];

/** Overlapping fanned cards of background-removed garments. */
export function HeroFan() {
  return (
    <div
      className="flex flex-nowrap items-start justify-start overflow-x-auto px-6 pt-4 pb-8 md:justify-center md:overflow-visible md:px-0"
      aria-label="Garments designed on Driplap"
    >
      {CARDS.map((card, index) => (
        <div
          key={card.src}
          style={{ zIndex: index }}
          className={cn(
            "w-32 shrink-0 overflow-hidden rounded-3xl shadow-[0_18px_50px_rgba(7,8,7,0.18)] ring-1 ring-[#070807]/10 transition-transform duration-300 hover:z-30 hover:scale-[1.04] hover:rotate-0 sm:w-40 md:w-52",
            "-ml-7 sm:-ml-9 md:-ml-12 first:ml-0",
            card.tint,
            card.rotate,
            card.lift,
          )}
        >
          <div className="relative aspect-[3/4] w-full">
            <Image
              src={card.src}
              alt={card.alt}
              fill
              priority={index < 3}
              sizes="(min-width: 768px) 13rem, 8rem"
              className="object-contain p-2"
            />
          </div>
        </div>
      ))}
    </div>
  );
}
