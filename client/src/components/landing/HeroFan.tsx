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
    src: "/landing/cutouts/landing-hero-1.png",
    alt: "Black dragon polo, background removed",
    tint: "bg-white",
    rotate: "md:-rotate-[6deg]",
    lift: "md:translate-y-4",
  },
  {
    src: "/landing/cutouts/landing-hero-editor.png",
    alt: "Cream embroidered Opium polo front, background removed",
    tint: "bg-[#070807]",
    rotate: "",
    lift: "",
  },
  {
    src: "/landing/cutouts/landing-hero-life.png",
    alt: "Cream embroidered Opium polo back, background removed",
    tint: "bg-[#e9e4d6]",
    rotate: "md:rotate-[6deg]",
    lift: "md:translate-y-4",
  },
];

/** Overlapping fanned cards of background-removed garments. */
export function HeroFan() {
  return (
    <div
      className="grid grid-cols-3 gap-3 px-1 md:flex md:flex-nowrap md:items-start md:justify-center md:gap-0 md:overflow-visible md:px-0 md:pt-4 md:pb-8"
      aria-label="Garments designed on Driblab"
    >
      {CARDS.map((card, index) => (
        <div
          key={card.src}
          style={{ zIndex: index }}
          className={cn(
            "overflow-hidden rounded-2xl shadow-[0_18px_50px_rgba(7,8,7,0.18)] ring-1 ring-[#070807]/10 transition-transform duration-300 hover:z-30 hover:scale-[1.04] hover:rotate-0 md:w-36 md:shrink-0 md:rounded-3xl lg:w-48 xl:w-52",
            "md:-ml-10 md:first:ml-0 lg:-ml-12",
            card.tint,
            card.rotate,
            card.lift,
          )}
        >
          <div className="relative aspect-3/4 w-full">
            <Image
              src={card.src}
              alt={card.alt}
              fill
              priority={index < 3}
              sizes="(min-width: 1280px) 13rem, (min-width: 1024px) 12rem, (min-width: 768px) 9rem, 33vw"
              className="object-contain p-2"
            />
          </div>
        </div>
      ))}
    </div>
  );
}
