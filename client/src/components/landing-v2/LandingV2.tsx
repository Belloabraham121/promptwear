"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Menu, X } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Hero } from "@/components/landing-v2/Hero";
import { NewDrops, Trending } from "@/components/landing-v2/Drops";
import {
  CampaignBreak,
  CreateThis,
  CreatorSpotlight,
  FinalCta,
  Lookbook,
  Marquee,
  TheEdit,
} from "@/components/landing-v2/Editorial";
import { InkButton, padX } from "@/components/landing-v2/primitives";
import { useAuth } from "@/providers/AuthProvider";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "#trending", label: "Trending" },
  { href: "#edit", label: "The Edit" },
  { href: "#creators", label: "Creators" },
  { href: "#how", label: "How it works" },
];

function Header({ authed }: { authed: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 grid grid-cols-[1fr_auto] items-center gap-4 py-4 text-[#070807] transition-colors duration-300 lg:grid-cols-[1fr_auto_1fr]",
          scrolled || open ? "bg-[#f3f0e8]/90 backdrop-blur-md" : "bg-transparent",
          padX,
        )}
      >
        <nav aria-label="Main" className="hidden items-center gap-7 whitespace-nowrap lg:flex">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-[0.7rem] font-semibold tracking-[0.18em] uppercase transition-opacity hover:opacity-50"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="lg:justify-self-center">
          <BrandLogo href="/" size="md" />
        </div>
        <div className="flex items-center justify-end gap-5">
          {authed ? null : (
            <Link
              href="/login"
              className="hidden text-[0.7rem] font-semibold tracking-[0.18em] uppercase transition-opacity hover:opacity-50 md:inline"
            >
              Log in
            </Link>
          )}
          <InkButton href="/dashboard" className="hidden px-5 py-3 text-[0.68rem] md:inline-flex">
            {authed ? "Open studio" : "Create yours"}
          </InkButton>
          <button
            type="button"
            className="grid size-11 place-items-center border border-[#070807]/25 md:hidden"
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {open ? (
        <nav
          aria-label="Mobile"
          className={cn("fixed inset-0 z-40 flex flex-col justify-between bg-[#f3f0e8] pt-28 pb-10 text-[#070807]", padX)}
        >
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {NAV.map((item, i) => (
              <li key={item.href} className="flex items-baseline gap-4 border-b border-[#070807]/15 py-3">
                <span className="text-[0.7rem] font-semibold tracking-[0.2em] text-[#5a6b14]">0{i + 1}</span>
                <a
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="font-heading text-[clamp(2.2rem,11vw,3.4rem)] leading-none font-extrabold tracking-[-0.05em]"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-4">
            <InkButton href="/dashboard" className="w-full">
              {authed ? "Open studio" : "Create yours"}
            </InkButton>
            {authed ? null : (
              <Link href="/login" className="text-center text-[0.72rem] font-semibold tracking-[0.2em] uppercase">
                Log in
              </Link>
            )}
          </div>
        </nav>
      ) : null}
    </>
  );
}

function Footer() {
  const columns = [
    {
      title: "Discover",
      links: [
        { href: "#trending", label: "Trending" },
        { href: "#new", label: "New drops" },
        { href: "#edit", label: "The Edit" },
        { href: "#community", label: "Community" },
      ],
    },
    {
      title: "Create",
      links: [
        { href: "/dashboard", label: "Open the studio" },
        { href: "/login?mode=signup", label: "Become a creator" },
        { href: "#how", label: "How it works" },
      ],
    },
    {
      title: "Account",
      links: [
        { href: "/login", label: "Log in" },
        { href: "/login?mode=signup", label: "Sign up" },
      ],
    },
  ];

  return (
    <footer className={cn("overflow-hidden bg-[#070807] pt-16 text-[#f3f0e8]", padX)}>
      <div className="grid gap-10 border-t border-[#f3f0e8]/15 pt-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <p className="m-0 max-w-[24ch] font-heading text-[1.4rem] leading-[1.15] font-bold tracking-[-0.03em]">
          A community creates the fashion. We make it real.
        </p>
        {columns.map((col) => (
          <div key={col.title}>
            <p className="m-0 mb-4 text-[0.66rem] font-semibold tracking-[0.22em] text-[#d6ff3c] uppercase">
              {col.title}
            </p>
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0 text-[0.9rem] text-[#c8c4b8]">
              {col.links.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="transition-colors hover:text-[#f3f0e8]">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p
        aria-hidden
        className="m-0 mt-16 pb-4 text-center font-heading text-[17vw] leading-[0.8] font-extrabold tracking-[-0.075em] lowercase"
      >
        driplab<span className="text-[#d6ff3c]">.</span>
      </p>
      <div className="flex flex-wrap justify-between gap-3 border-t border-[#f3f0e8]/15 py-5 text-[0.72rem] tracking-[0.1em] text-[#c8c4b8] uppercase">
        <span>© {new Date().getFullYear()} Driplab</span>
        <span>Designed by the community · Made in Lagos</span>
      </div>
    </footer>
  );
}

/** Lime "Remix" disc that follows the pointer over elements with data-cursor. */
function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    const el = dot.current;
    if (!el || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const x = gsap.quickTo(el, "x", { duration: 0.35, ease: "power3.out" });
    const y = gsap.quickTo(el, "y", { duration: 0.35, ease: "power3.out" });
    const onMove = (event: PointerEvent) => {
      x(event.clientX);
      y(event.clientY);
      const target = (event.target as Element | null)?.closest<HTMLElement>("[data-cursor]");
      setLabel(target?.dataset.cursor ?? null);
    };
    // Hide the disc when the pointer leaves the window while over a card.
    const onLeave = () => setLabel(null);
    const doc = document.documentElement;
    window.addEventListener("pointermove", onMove);
    doc.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      doc.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div
      ref={dot}
      aria-hidden
      className="pointer-events-none fixed top-0 left-0 z-[60] hidden md:block"
    >
      <div
        className={cn(
          "-translate-x-1/2 -translate-y-1/2 grid size-24 place-items-center rounded-full bg-[#d6ff3c] text-[0.7rem] font-bold tracking-[0.2em] text-[#070807] uppercase transition-[scale,opacity] duration-300",
          label ? "scale-100 opacity-100" : "scale-0 opacity-0",
        )}
      >
        {label}
      </div>
    </div>
  );
}

export function LandingV2() {
  const { isAuthenticated, isLoading } = useAuth();
  const authed = !isLoading && isAuthenticated;
  const root = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const mm = gsap.matchMedia();
    const ctx = gsap.context(() => {
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.utils.toArray<HTMLElement>("[data-split]").forEach((heading) => {
          if (heading.closest("[data-hero]")) return;
          gsap.from(heading.querySelectorAll("[data-line]"), {
            yPercent: 110,
            duration: 1.1,
            ease: "expo.out",
            stagger: 0.08,
            scrollTrigger: { trigger: heading, start: "top 88%" },
          });
        });

        ScrollTrigger.batch("[data-reveal]", {
          start: "top 92%",
          once: true,
          onEnter: (batch) =>
            gsap.from(batch, { y: 48, opacity: 0, duration: 1.1, ease: "expo.out", stagger: 0.08 }),
        });

        gsap.utils.toArray<HTMLElement>("[data-parallax]").forEach((frame) => {
          const media = frame.querySelector("[data-parallax-media]");
          if (!media) return;
          gsap.fromTo(
            media,
            { yPercent: -6 },
            {
              yPercent: 6,
              ease: "none",
              scrollTrigger: { trigger: frame, start: "top bottom", end: "bottom top", scrub: true },
            },
          );
        });
      });
    }, root);

    return () => {
      mm.revert();
      ctx.revert();
    };
  }, []);

  return (
    <div ref={root} className="min-h-dvh overflow-x-clip bg-[#f3f0e8] font-sans text-[#070807] [&_a]:no-underline">
      <Header authed={authed} />
      <Cursor />
      <main>
        <div data-hero>
          <Hero />
        </div>
        <Marquee />
        <Trending />
        <CampaignBreak
          name="studio"
          tone="ink"
          kicker="Prompt it · Sketch it · Both"
          lines={["Create", "your way."]}
          alt="Model in an oversized black tee with a lime graphic in a sunlit studio"
        />
        <section className="bg-[#f3f0e8] pt-[clamp(5rem,14vh,9rem)]">
          <TheEdit />
          <NewDrops />
        </section>
        <CreatorSpotlight />
        <CreateThis />
        <CampaignBreak
          name="street"
          tone="bone"
          kicker="Lagos · Golden hour"
          lines={["Discover", "your people."]}
          alt="Three friends laughing on a Lagos street at golden hour in Driplab tees"
        />
        <Lookbook />
        <FinalCta authed={authed} />
      </main>
      <Footer />
    </div>
  );
}
