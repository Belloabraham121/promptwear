"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import {
  formatNaira,
  newDrops,
  trending,
  v2Image,
  type Drop,
} from "@/components/landing-v2/data";
import { Kicker, SplitHeading, TextLink, padX } from "@/components/landing-v2/primitives";
import { cn } from "@/lib/utils";

function DropCard({
  drop,
  trendingRank,
  sizes,
}: {
  drop: Drop;
  trendingRank?: number;
  sizes: string;
}) {
  return (
    <Link
      href="/dashboard"
      data-cursor="Remix"
      aria-label={`${drop.title} by ${drop.creator} — remix this design`}
      className="group block text-[#070807]"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-[#ece8de]">
        <Image
          src={v2Image(drop.image)}
          alt=""
          fill
          sizes={sizes}
          className={cn(
            "object-cover transition-[opacity,scale] duration-700 ease-[cubic-bezier(.2,.8,.2,1)] group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100",
            drop.worn && "group-hover:opacity-0",
          )}
        />
        {drop.worn ? (
          <Image
            src={v2Image(drop.worn)}
            alt=""
            fill
            sizes={sizes}
            className="scale-[1.04] object-cover opacity-0 transition-[opacity,scale] duration-700 ease-[cubic-bezier(.2,.8,.2,1)] group-hover:scale-100 group-hover:opacity-100 motion-reduce:scale-100 motion-reduce:transition-none"
          />
        ) : null}

        <div className="absolute inset-x-3 top-3 flex items-start justify-between text-[0.62rem] font-semibold tracking-[0.2em] uppercase">
          <span className="mix-blend-difference text-[#f3f0e8]">No. {drop.id}</span>
          {trendingRank ? (
            <span className="bg-[#d6ff3c] px-2 py-1 text-[#070807]">↑ Trending #{trendingRank}</span>
          ) : null}
        </div>

        <div className="absolute inset-x-0 bottom-0 hidden translate-y-full items-center justify-between bg-[#070807] px-4 py-3 text-[0.68rem] font-bold tracking-[0.2em] text-[#f3f0e8] uppercase transition-transform duration-500 ease-[cubic-bezier(.2,.8,.2,1)] group-hover:translate-y-0 md:flex motion-reduce:translate-y-0 motion-reduce:opacity-0 motion-reduce:transition-none motion-reduce:group-hover:opacity-100">
          Remix this design
          <ArrowUpRight size={14} strokeWidth={2.5} className="text-[#d6ff3c]" />
        </div>
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-3">
        <h3 className="m-0 font-heading text-[1.05rem] font-bold tracking-[-0.03em]">{drop.title}</h3>
        <span className="text-[0.82rem] tabular-nums">from {formatNaira(drop.from)}</span>
      </div>
      <p className="mt-1 mb-0 flex justify-between gap-3 text-[0.78rem] text-[#5a574f]">
        <span>{drop.creator}</span>
        <span>{drop.garment}</span>
      </p>
    </Link>
  );
}

export function Trending() {
  const rail = useRef<HTMLUListElement>(null);

  const nudge = (direction: 1 | -1) => {
    const el = rail.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <section id="trending" className="scroll-mt-20 bg-[#f3f0e8] py-[clamp(4.5rem,12vh,8rem)] text-[#070807]">
      <div className={cn("flex flex-wrap items-end justify-between gap-6", padX)}>
        <div>
          <Kicker index="01" className="text-[#5a6b14]">Trending now</Kicker>
          <SplitHeading
            lines={["What Lagos is", "wearing this week."]}
            className="mt-5 text-[clamp(2.4rem,6.4vw,5.6rem)] leading-[0.92] font-extrabold tracking-[-0.055em]"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => nudge(-1)}
            aria-label="Previous designs"
            className="grid size-12 place-items-center border border-[#070807]/20 transition-colors hover:border-[#070807] hover:bg-[#070807] hover:text-[#f3f0e8]"
          >
            <ArrowLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => nudge(1)}
            aria-label="Next designs"
            className="grid size-12 place-items-center border border-[#070807]/20 transition-colors hover:border-[#070807] hover:bg-[#070807] hover:text-[#f3f0e8]"
          >
            <ArrowRight size={18} />
          </button>
        </div>
      </div>

      <ul
        ref={rail}
        className={cn(
          "m-0 mt-12 flex list-none snap-x snap-mandatory gap-[clamp(0.75rem,1.6vw,1.5rem)] overflow-x-auto p-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          "scroll-px-[clamp(1.15rem,4vw,3.5rem)]",
          padX,
        )}
      >
        {trending.map((drop, i) => (
          <li
            key={drop.id}
            data-reveal
            className="w-[74vw] shrink-0 snap-start sm:w-[44vw] md:w-[30vw] lg:w-[23vw]"
          >
            <DropCard drop={drop} trendingRank={i + 1} sizes="(min-width: 1024px) 23vw, (min-width: 768px) 30vw, 74vw" />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function NewDrops() {
  return (
    <section id="new" className={cn("scroll-mt-20 bg-[#f3f0e8] pb-[clamp(4.5rem,12vh,8rem)] text-[#070807]", padX)}>
      <div className="grid gap-10 border-t border-[#070807] pt-8 lg:grid-cols-[minmax(16rem,0.7fr)_2fr]">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <Kicker index="03" className="text-[#5a6b14]">New drops</Kicker>
          <SplitHeading
            lines={["Fresh off", "the press."]}
            className="mt-5 text-[clamp(2.2rem,4.6vw,4rem)] leading-[0.92] font-extrabold tracking-[-0.055em]"
          />
          <p className="mt-5 mb-7 max-w-[32ch] text-[0.95rem] leading-[1.55] text-[#5a574f]">
            Published this week by the community. Wear one as it is, or open it in the studio and
            make it yours.
          </p>
          <TextLink href="/dashboard">Start from a blank</TextLink>
        </div>

        <ul className="m-0 grid list-none grid-cols-2 gap-x-[clamp(0.75rem,1.6vw,1.5rem)] gap-y-10 p-0 md:grid-cols-3">
          {newDrops.map((drop, i) => (
            <li key={drop.id} data-reveal className={cn(i % 3 === 1 && "md:translate-y-16")}>
              <DropCard drop={drop} sizes="(min-width: 768px) 22vw, 46vw" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
