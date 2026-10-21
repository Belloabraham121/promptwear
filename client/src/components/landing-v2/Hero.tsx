"use client";

import Image from "next/image";
import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { heroCutouts, v2Image } from "@/components/landing-v2/data";
import { InkButton, TextLink, padX } from "@/components/landing-v2/primitives";
import { cn } from "@/lib/utils";

/** Fan pose per garment: rotation (deg), arc lift (vw) and parallax depth. */
const FAN = [
  { rotate: -14, lift: 3.2, depth: 0.6 },
  { rotate: -8, lift: 1.1, depth: 1 },
  { rotate: -2.5, lift: 0, depth: 1.5 },
  { rotate: 3, lift: 0.2, depth: 1.3 },
  { rotate: 8.5, lift: 1.3, depth: 0.9 },
  { rotate: 14, lift: 3.4, depth: 0.55 },
];

const WORD = "driplab";

export function Hero() {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;

    const mm = gsap.matchMedia();
    const ctx = gsap.context(() => {
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
        tl.from("[data-hero-char]", { yPercent: 105, duration: 1.3, stagger: 0.05 })
          .from(
            "[data-hero-card]",
            {
              y: 160,
              opacity: 0,
              scale: 0.85,
              duration: 1.4,
              stagger: { each: 0.08, from: "center" },
            },
            "-=1.05",
          )
          .from("[data-hero-fade]", { y: 18, opacity: 0, duration: 1, stagger: 0.08 }, "-=1.1");
      });

      // Cards drift toward the cursor, nearer garments more than far ones.
      mm.add("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)", () => {
        const cards = gsap.utils.toArray<HTMLElement>("[data-hero-drift]");
        const movers = cards.map((card) => ({
          depth: Number(card.dataset.depth ?? 1),
          x: gsap.quickTo(card, "x", { duration: 0.9, ease: "power3.out" }),
          y: gsap.quickTo(card, "y", { duration: 0.9, ease: "power3.out" }),
        }));
        const onMove = (event: PointerEvent) => {
          const rect = el.getBoundingClientRect();
          const nx = (event.clientX - rect.left) / rect.width - 0.5;
          const ny = (event.clientY - rect.top) / rect.height - 0.5;
          movers.forEach((m) => {
            m.x(nx * 38 * m.depth);
            m.y(ny * 26 * m.depth);
          });
        };
        el.addEventListener("pointermove", onMove);
        return () => el.removeEventListener("pointermove", onMove);
      });
    }, el);

    return () => {
      mm.revert();
      ctx.revert();
    };
  }, []);

  return (
    <section
      ref={root}
      className={cn(
        "relative flex min-h-[100svh] flex-col overflow-hidden bg-[#f3f0e8] pt-24 pb-8 text-[#070807] md:pt-28",
        padX,
      )}
    >
      <div
        data-hero-fade
        className="flex items-center justify-between text-[0.66rem] font-semibold tracking-[0.22em] uppercase"
      >
        <span>Issue 01 — AW26</span>
        <span className="hidden sm:inline">Lagos, Nigeria</span>
        <span>Made to order</span>
      </div>

      <div className="relative mt-[clamp(1.5rem,5vh,3rem)] flex flex-1 flex-col justify-center">
        <h1 className="m-0 text-center font-heading text-[clamp(3.4rem,17vw,22rem)] md:text-[17vw] leading-[0.78] font-extrabold tracking-[-0.075em] lowercase">
          <span className="sr-only">Driplab — wear what the community creates</span>
          <span aria-hidden className="inline-flex overflow-hidden pt-[0.04em] pb-[0.08em]">
            {WORD.split("").map((char, i) => (
              <span key={i} data-hero-char className="inline-block">
                {char}
              </span>
            ))}
            <span data-hero-char className="inline-block text-[#5a6b14]">
              .
            </span>
          </span>
        </h1>

        <ul className="relative z-10 m-0 -mt-[3vw] flex list-none items-start justify-center p-0 md:-mt-[7.5vw]">
          {heroCutouts.map((cutout, i) => {
            const pose = FAN[i];
            return (
              <li
                key={cutout.file}
                data-hero-drift
                data-depth={pose.depth}
                className={cn(
                  "relative -mx-[2.5vw] w-[30vw] shrink-0 sm:w-[26vw] md:-mx-[1.6vw] md:w-[17vw] xl:w-[16vw]",
                  (i === 0 || i === heroCutouts.length - 1) && "hidden md:block",
                )}
                style={{ zIndex: i === 2 || i === 3 ? 6 : 5 - Math.abs(2.5 - i) }}
              >
                {/* Pose stays on its own element so GSAP never folds it into a pixel transform. */}
                <div style={{ rotate: `${pose.rotate}deg`, translate: `0 ${pose.lift}vw` }}>
                  <div data-hero-card>
                    <div className="transition-transform duration-500 ease-[cubic-bezier(.2,.8,.2,1)] hover:-translate-y-4 hover:scale-[1.06] hover:rotate-[-2deg] motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:hover:scale-100 motion-reduce:hover:rotate-0">
                      <Image
                        src={v2Image(cutout.file)}
                        alt={cutout.alt}
                        width={1214}
                        height={1295}
                        sizes="(min-width: 768px) 17vw, 30vw"
                        preload={i === 2}
                        className="h-auto w-full drop-shadow-[0_24px_30px_rgba(7,8,7,0.22)]"
                      />
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="relative z-20 mt-10 grid items-end gap-6 md:mt-6 md:grid-cols-[1fr_auto]">
        <p
          data-hero-fade
          className="m-0 max-w-[30ch] font-heading text-[clamp(1.15rem,2vw,1.6rem)] leading-[1.15] font-bold tracking-[-0.03em]"
        >
          Create your way. Discover your people. Wear what the community creates.
        </p>
        <div data-hero-fade className="flex flex-wrap items-center gap-x-7 gap-y-4">
          <InkButton href="/dashboard">Create yours</InkButton>
          <TextLink href="#trending">Explore the drop</TextLink>
        </div>
      </div>
    </section>
  );
}
