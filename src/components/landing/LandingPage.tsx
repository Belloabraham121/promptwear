"use client";

import dynamic from "next/dynamic";
import {
  ArrowDown,
  ArrowUpRight,
  Menu,
  PenTool,
  Plus,
  Shirt,
  Sparkles,
  X,
} from "lucide-react";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { cn } from "@/lib/utils";
import { AudienceArt } from "./AudienceArt";
import { IntroLoader } from "./IntroLoader";

const ShirtScene = dynamic(
  () => import("./ShirtScene").then((mod) => mod.ShirtScene),
  { ssr: false },
);

const steps = [
  {
    number: "01",
    eyebrow: "Describe",
    title: "Start with a thought.",
    body: "Type the idea exactly as it lives in your head. Promptwear turns language into artwork worth wearing.",
    caption: "Blank canvas. Infinite prompt.",
    icon: Sparkles,
  },
  {
    number: "02",
    eyebrow: "Draw / enhance",
    title: "Make your mark.",
    body: "Sketch freely or let AI polish the rough edges. Your hand stays in the work—technology just pushes it further.",
    caption: "Sketch resolves into print.",
    icon: PenTool,
  },
  {
    number: "03",
    eyebrow: "Customize & order",
    title: "Fit it. Wear it.",
    body: "Lock the cut, colour and finish. We print, quality-check and deliver your piece across Nigeria in seven days.",
    caption: "Your tee. Ready for the street.",
    icon: Shirt,
  },
];

const methods = [
  {
    id: "01",
    eyebrow: "Prompt it",
    title: "Words become wearable art.",
    demo: "“A chrome heart melting into blue flame, Y2K editorial.”",
    type: "ai" as const,
  },
  {
    id: "02",
    eyebrow: "Draw it",
    title: "Your hand. Your signature.",
    demo: null,
    type: "draw" as const,
  },
  {
    id: "03",
    eyebrow: "Mix both",
    title: "Human instinct. AI momentum.",
    demo: "ROUGH → READY",
    type: "hybrid" as const,
  },
];

const audiences = [
  {
    number: "01",
    label: "Campus",
    title: "Crews that want the same fit.",
    body: "Department drops, hostel runs, friend groups matching without the group-chat design drama.",
  },
  {
    number: "02",
    label: "Events",
    title: "Merch that shows up with the night.",
    body: "Concert kits, launch nights, tour drops—print for the room without waiting on an agency.",
  },
  {
    number: "03",
    label: "Brands",
    title: "First collection energy.",
    body: "Starting a tee brand or testing a drop? Ship sample-to-batch without the design invoice.",
  },
];

const marqueeItems = [
  "YOUR IDEA",
  "YOUR CANVAS",
  "YOUR FIT",
  "MADE IN NIGERIA",
  "DELIVERED IN 7 DAYS",
  "YOUR IDEA",
  "YOUR CANVAS",
  "YOUR FIT",
  "MADE IN NIGERIA",
  "DELIVERED IN 7 DAYS",
];

const padX = "px-[clamp(1.1rem,3vw,2.4rem)]";

export function LandingPage() {
  const root = useRef<HTMLDivElement>(null);
  const howSection = useRef<HTMLElement>(null);
  const howPin = useRef<HTMLDivElement>(null);
  const audienceSection = useRef<HTMLElement>(null);
  const heroBrandRef = useRef<HTMLSpanElement>(null);
  const sceneProgress = useRef(0);
  const [activeStep, setActiveStep] = useState(0);
  const [activeAudience, setActiveAudience] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isNarrow, setIsNarrow] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [introDone, setIntroDone] = useState(false);

  const handleSceneReady = useCallback(() => {
    setSceneReady(true);
  }, []);

  const handleIntroComplete = useCallback(() => {
    setIntroDone(true);
  }, []);

  useLayoutEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const narrow = window.matchMedia("(max-width: 767px)");
    const sync = () => {
      setReducedMotion(media.matches);
      setIsNarrow(narrow.matches);
    };
    sync();
    media.addEventListener("change", sync);
    narrow.addEventListener("change", sync);
    return () => {
      media.removeEventListener("change", sync);
      narrow.removeEventListener("change", sync);
    };
  }, []);

  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      // Pin-scrub story is desktop-only; mobile uses stacked static steps
      if (howSection.current && !reducedMotion && !isNarrow) {
        ScrollTrigger.create({
          trigger: howSection.current,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.45,
          onUpdate: (self) => {
            sceneProgress.current = self.progress;
            const next = Math.min(2, Math.floor(self.progress * 3));
            setActiveStep((current) => (current === next ? current : next));
          },
        });

        gsap.to("[data-scene-layer]", {
          opacity: 0,
          yPercent: 12,
          ease: "none",
          scrollTrigger: {
            trigger: howSection.current,
            start: "bottom 90%",
            end: "bottom top",
            scrub: 0.4,
          },
        });
      }

      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((element) => {
        gsap.from(element, {
          y: reducedMotion ? 0 : 56,
          opacity: 0,
          duration: 0.95,
          ease: "power3.out",
          scrollTrigger: {
            trigger: element,
            start: "top 90%",
          },
        });
      });
    }, root);

    ScrollTrigger.refresh();
    return () => ctx.revert();
  }, [isNarrow, reducedMotion]);

  // Keep the hero wordmark fully visible on narrow viewports
  useLayoutEffect(() => {
    const el = heroBrandRef.current;
    const mask = el?.parentElement;
    if (!el || !mask) return;

    const fit = () => {
      el.style.transform = "none";
      const available = mask.clientWidth;
      const needed = el.scrollWidth;
      if (needed > available && available > 0) {
        const scale = available / needed;
        el.style.transform = `scale(${scale})`;
        el.style.transformOrigin = "left center";
      }
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(mask);
    window.addEventListener("resize", fit);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, [introDone, isNarrow]);

  useLayoutEffect(() => {
    if (!introDone) return;

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const ctx = gsap.context(() => {
      if (media.matches) {
        gsap.set("[data-hero-line], [data-hero-fade], [data-nav-enter]", {
          opacity: 1,
          clearProps: "transform",
        });
        return;
      }

      gsap.from("[data-nav-enter]", {
        y: -16,
        opacity: 0,
        duration: 0.7,
        ease: "power3.out",
      });
      gsap.from("[data-hero-line]", {
        yPercent: 110,
        duration: 1.15,
        stagger: 0.08,
        ease: "power4.out",
        onComplete: () => {
          // Re-fit after GSAP settles so scale isn't fighting the entrance
          const el = heroBrandRef.current;
          const mask = el?.parentElement?.parentElement;
          if (!el || !mask) return;
          el.style.transform = "none";
          const available = mask.clientWidth;
          const needed = el.scrollWidth;
          if (needed > available && available > 0) {
            el.style.transform = `scale(${available / needed})`;
            el.style.transformOrigin = "left center";
          }
        },
      });
      gsap.from("[data-hero-fade]", {
        y: 24,
        opacity: 0,
        duration: 0.85,
        stagger: 0.08,
        delay: 0.2,
        ease: "power3.out",
      });
    }, root);

    return () => ctx.revert();
  }, [introDone]);

  const step = steps[activeStep] ?? steps[0];
  return (
    <div
      ref={root}
      className="min-h-dvh overflow-x-clip bg-[#070807] font-sans text-[#f3f0e8] [&_a]:text-inherit [&_a]:no-underline"
    >
      {!introDone ? (
        <IntroLoader
          ready={sceneReady}
          reducedMotion={reducedMotion}
          onComplete={handleIntroComplete}
        />
      ) : null}

      <header
        data-nav-enter
        className={cn(
          "fixed inset-x-0 top-0 z-40 grid grid-cols-[1fr_auto] items-center gap-4 py-[1.1rem] md:grid-cols-[1fr_auto_1fr]",
          padX,
          "bg-[linear-gradient(180deg,color-mix(in_oklab,#070807_88%,transparent)_0%,transparent_100%)]",
          !introDone && "pointer-events-none opacity-0",
        )}
      >
        <a
          href="#"
          className="font-heading text-[1.05rem] font-bold tracking-[-0.04em] lowercase"
          aria-label="Promptwear home"
        >
          promptwear
        </a>
        <nav
          className="hidden gap-7 text-[0.78rem] tracking-[0.08em] uppercase md:flex"
          aria-label="Main"
        >
          <a href="#how">How it works</a>
          <a href="#create">Create</a>
          <a href="#pricing">Pricing</a>
        </nav>
        <div className="hidden items-center justify-end gap-[0.85rem] md:flex">
          <a
            href="/login"
            className="text-[0.78rem] tracking-[0.08em] uppercase opacity-[0.72]"
          >
            Log in
          </a>
          <a
            href="/dashboard"
            className="inline-flex items-center gap-[0.35rem] border-b border-current pb-[0.15rem] text-[0.78rem] tracking-[0.06em] uppercase"
          >
            Start designing
            <ArrowUpRight size={15} strokeWidth={2.25} />
          </a>
        </div>
        <button
          type="button"
          className="grid size-10 place-items-center justify-self-end border border-[color-mix(in_oklab,#f3f0e8_35%,transparent)] bg-transparent text-[#f3f0e8] md:hidden"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      {menuOpen ? (
        <nav
          className={cn(
            "fixed inset-0 z-[35] flex flex-col justify-center gap-6 bg-[#070807] p-8 font-heading text-[clamp(2rem,8vw,3.5rem)] font-bold tracking-[-0.04em]",
            !introDone && "pointer-events-none opacity-0",
          )}
          aria-label="Mobile"
        >
          <a href="#how" onClick={() => setMenuOpen(false)}>
            How it works
          </a>
          <a href="#create" onClick={() => setMenuOpen(false)}>
            Create
          </a>
          <a href="#pricing" onClick={() => setMenuOpen(false)}>
            Pricing
          </a>
          <a href="/dashboard" onClick={() => setMenuOpen(false)}>
            Start designing
          </a>
        </nav>
      ) : null}

      <main>
        <div
          className="relative z-[1] isolate bg-[radial-gradient(ellipse_70%_55%_at_72%_42%,rgba(214,255,60,0.07),transparent_55%),radial-gradient(ellipse_50%_40%_at_20%_80%,rgba(80,100,90,0.18),transparent_50%),linear-gradient(165deg,#0c0e0b_0%,#070807_45%,#10140f_100%)]"
        >
          {/* Desktop: sticky tee shared across hero + how scrub */}
          {!isNarrow ? (
            <div
              className="pointer-events-none sticky top-0 z-[1] mb-[-100vh] h-dvh w-full will-change-[opacity,transform] [&_canvas]:!h-full [&_canvas]:!w-full"
              data-scene-layer
              aria-hidden="true"
            >
              <div className="pointer-events-none absolute inset-[18%_8%_12%_35%] bg-[radial-gradient(circle_at_55%_45%,rgba(214,255,60,0.12),transparent_62%)] blur-[28px] md:inset-[12%_5%_10%_42%] min-[1100px]:inset-[10%_2%_8%_48%]" />
              <ShirtScene
                key="shirt-desktop"
                progress={sceneProgress}
                onReady={handleSceneReady}
              />
              <div
                className={cn(
                  "absolute right-[clamp(1rem,3vw,2.5rem)] bottom-[clamp(1.2rem,3vh,2rem)] flex flex-col items-end gap-1 text-[0.68rem] tracking-[0.14em] text-[#c8c4b8] uppercase",
                  !introDone && "opacity-0",
                )}
              >
                <span>{String(activeStep + 1).padStart(2, "0")} / 03</span>
                <span>{step.caption}</span>
              </div>
            </div>
          ) : null}

          <section
            className={cn(
              "relative z-[2] flex min-h-dvh items-end overflow-hidden pointer-events-none",
              "pt-[6.5rem] pb-[clamp(2rem,6vh,3.5rem)]",
              padX,
              "md:items-center md:overflow-visible md:pt-0",
            )}
          >
            {/* Mobile: tee is clipped to the hero only — gone when How it works starts */}
            {isNarrow ? (
              <div
                className="pointer-events-none absolute inset-0 z-0 [&_canvas]:!h-full [&_canvas]:!w-full"
                data-scene-layer
                aria-hidden="true"
              >
                <ShirtScene
                  key="shirt-mobile"
                  progress={sceneProgress}
                  onReady={handleSceneReady}
                  mobile
                />
              </div>
            ) : null}

            <div
              className={cn(
                "relative z-[3] w-full max-w-[min(58rem,100%)] overflow-visible pointer-events-auto md:w-[min(62rem,64vw)]",
                "before:pointer-events-none before:absolute before:-z-[1]",
                // Mobile: darker copy scrim — soft blurry fade at the top into solid ink
                "max-md:before:inset-[-28%_-16%_-24%_-14%] max-md:before:bg-[linear-gradient(180deg,transparent_0%,color-mix(in_oklab,#070807_45%,transparent)_22%,color-mix(in_oklab,#070807_88%,transparent)_52%,#070807_78%)] max-md:before:blur-[22px]",
                // Desktop: soft radial veil behind the wordmark
                "md:before:inset-[-22%_-12%_-30%_-10%] md:before:bg-[radial-gradient(ellipse_at_28%_45%,color-mix(in_oklab,#070807_94%,transparent)_0%,color-mix(in_oklab,#070807_70%,transparent)_42%,transparent_72%)]",
                !introDone && "pointer-events-none opacity-0",
              )}
            >
              <h1
                className="m-0 w-full max-w-full font-heading text-[clamp(2.1rem,10vw,6.25rem)] font-extrabold leading-[0.92] tracking-[-0.065em] text-[#f3f0e8] lowercase md:text-[clamp(2.75rem,9vw,6.25rem)]"
                aria-label="Promptwear"
              >
                <span className="block w-full max-w-full overflow-hidden">
                  <span className="block" data-hero-line>
                    <span
                      ref={heroBrandRef}
                      className="inline-block w-max will-change-transform"
                    >
                      promptwear
                    </span>
                  </span>
                </span>
              </h1>
              <div className="mt-[1.1rem] w-full max-w-[28rem] md:max-w-[26rem]">
                <p
                  className="mt-[1.35rem] mb-0 max-w-[18ch] font-heading text-[clamp(1.25rem,4.6vw,2rem)] font-semibold leading-[1.15] tracking-[-0.03em]"
                  data-hero-fade
                >
                  If you can imagine it, you can wear it.
                </p>
                <p
                  className="mt-[0.9rem] mb-0 max-w-[34ch] text-[0.95rem] leading-[1.55] text-[#c8c4b8] sm:text-[0.98rem]"
                  data-hero-fade
                >
                  Describe it. Draw it. Or combine both. Custom tees from idea
                  to door in seven days.
                </p>
                <div
                  className="mt-7 flex flex-col items-start gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-[1.1rem] sm:gap-y-3"
                  data-hero-fade
                >
                  <a
                    href="/dashboard"
                    className="inline-flex w-full items-center justify-center gap-[0.45rem] rounded-[2px] bg-[#d6ff3c] px-5 py-[0.9rem] text-[0.82rem] font-bold tracking-[0.04em] text-[#070807] uppercase transition-[transform,background] duration-[250ms] hover:-translate-y-px hover:bg-[color-mix(in_oklab,#d6ff3c_88%,white)] sm:w-auto [&_svg]:text-[#070807]"
                  >
                    Start designing
                    <ArrowUpRight size={17} strokeWidth={2.25} />
                  </a>
                  <a
                    href="#how"
                    className="inline-flex w-fit items-center gap-[0.4rem] border-b border-[color-mix(in_oklab,#f3f0e8_35%,transparent)] pb-[0.2rem] text-[0.78rem] tracking-[0.08em] text-[#c8c4b8] uppercase transition-colors hover:text-[#f3f0e8]"
                  >
                    See how it works
                    <ArrowDown size={15} strokeWidth={2.25} />
                  </a>
                </div>
              </div>
            </div>
          </section>

          <section
            ref={howSection}
            id="how"
            className={cn(
              "relative z-[2] pointer-events-none",
              // Solid full-bleed cover so the hero tee never ghosts through on mobile
              isNarrow || reducedMotion
                ? "h-auto w-full bg-[#070807] shadow-[0_-32px_64px_rgba(7,8,7,1)]"
                : "h-[320vh]",
            )}
          >
            <div
              ref={howPin}
              className={cn(
                "flex max-w-[min(28rem,100%)] flex-col justify-center pt-[5.5rem] pb-10 pointer-events-auto md:max-w-[min(30rem,42vw)]",
                padX,
                isNarrow || reducedMotion
                  ? "relative h-auto"
                  : "sticky top-0 h-dvh",
              )}
            >
              <div>
                <p className="m-0 text-[0.7rem] tracking-[0.16em] text-[#d6ff3c] uppercase">
                  How it works
                </p>
                <span className="mt-[0.45rem] block font-heading text-[1.05rem] font-semibold tracking-[-0.02em] text-[#c8c4b8]">
                  Three moves. One original.
                </span>
              </div>

              {isNarrow || reducedMotion ? (
                <div className="mt-8 grid gap-8">
                  {steps.map((item) => {
                    const Icon = item.icon;
                    return (
                      <article key={item.number} className="relative max-w-[26rem]">
                        <div className="mb-[0.85rem] flex items-center gap-[0.55rem] text-[0.68rem] tracking-[0.14em] text-[#c8c4b8] uppercase">
                          <span>{item.number}</span>
                          <Icon size={16} />
                          <span>{item.eyebrow}</span>
                        </div>
                        <h2 className="m-0 font-heading text-[clamp(1.65rem,7vw,2.65rem)] font-bold leading-[1.05] tracking-[-0.04em]">
                          {item.title}
                        </h2>
                        <p className="mt-[0.85rem] mb-0 max-w-[34ch] text-[0.98rem] leading-[1.55] text-[#c8c4b8]">
                          {item.body}
                        </p>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="relative mt-9 min-h-48">
                  {steps.map((item, index) => {
                    const Icon = item.icon;
                    const active = activeStep === index;
                    return (
                      <article
                        key={item.number}
                        className={cn(
                          "absolute top-0 left-0 max-w-[26rem] transition-[opacity,transform] duration-[450ms] ease-in-out",
                          active
                            ? "translate-y-0 opacity-100 pointer-events-auto"
                            : "translate-y-[18px] opacity-0 pointer-events-none",
                        )}
                        aria-hidden={!active}
                      >
                        <div className="mb-[0.85rem] flex items-center gap-[0.55rem] text-[0.68rem] tracking-[0.14em] text-[#c8c4b8] uppercase">
                          <span>{item.number}</span>
                          <Icon size={16} />
                          <span>{item.eyebrow}</span>
                        </div>
                        <h2 className="m-0 font-heading text-[clamp(1.85rem,4vw,2.65rem)] font-bold leading-[1.05] tracking-[-0.04em]">
                          {item.title}
                        </h2>
                        <p className="mt-[0.85rem] mb-0 max-w-[34ch] text-[0.98rem] leading-[1.55] text-[#c8c4b8]">
                          {item.body}
                        </p>
                      </article>
                    );
                  })}
                </div>
              )}

              {!isNarrow && !reducedMotion ? (
                <div className="mt-10 flex gap-[0.4rem]" aria-hidden="true">
                  {steps.map((item, index) => (
                    <span
                      key={item.number}
                      className={cn(
                        "h-0.5 w-[2.4rem] transition-colors duration-[350ms]",
                        activeStep >= index
                          ? "bg-[#d6ff3c]"
                          : "bg-[color-mix(in_oklab,#f3f0e8_18%,transparent)]",
                      )}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </section>
        </div>

        <div className="relative z-10 bg-[#070807] shadow-[0_-48px_96px_rgba(7,8,7,0.92)]">
          <div
            className="overflow-hidden border-y border-[color-mix(in_oklab,#f3f0e8_12%,transparent)] bg-[#070807] py-4"
            aria-hidden="true"
          >
            <div className="pw-marquee-track flex w-max gap-8 font-heading text-[clamp(0.95rem,2vw,1.2rem)] font-bold tracking-[0.12em] uppercase whitespace-nowrap">
              {marqueeItems.map((item, index) => (
                <span key={`${item}-${index}`} className="inline-flex items-center">
                  {item}
                  <i className="ml-8 not-italic text-[#d6ff3c]">/</i>
                </span>
              ))}
            </div>
          </div>

          <section id="create" className={cn("relative z-[1] bg-[#070807] py-[clamp(4.5rem,10vh,7rem)]", padX)}>
            <div
              className="mb-6 flex items-center gap-3 text-[0.7rem] tracking-[0.16em] text-[#c8c4b8] uppercase"
              data-reveal
            >
              <span className="text-[#d6ff3c]">02</span>
              <span>Create your way</span>
            </div>
            <div
              className="mb-[clamp(2.5rem,5vw,3.5rem)] grid max-w-[42rem] gap-4"
              data-reveal
            >
              <h2 className="m-0 font-heading text-[clamp(2.2rem,5.5vw,4rem)] font-bold leading-[1.02] tracking-[-0.045em]">
                There is no wrong way
                <br />
                to start something.
              </h2>
              <p className="m-0 max-w-[38ch] leading-[1.55] text-[#c8c4b8]">
                A sentence, a scribble, a reference—or all three. AI augments your
                creativity. It never replaces it.
              </p>
            </div>

            <div className="grid gap-px border border-[color-mix(in_oklab,#f3f0e8_12%,transparent)] bg-[color-mix(in_oklab,#f3f0e8_12%,transparent)] md:grid-cols-3">
              {methods.map((method) => (
                <article
                  key={method.id}
                  className="flex min-h-[18rem] flex-col justify-between gap-8 bg-[#070807] p-5 sm:min-h-[22rem] sm:p-6"
                  data-reveal
                >
                  <div>
                    <span className="text-[0.7rem] tracking-[0.14em] text-[#c8c4b8]">
                      {method.id}
                    </span>
                  </div>
                  {method.type === "ai" && method.demo ? (
                    <div className="border border-[color-mix(in_oklab,#f3f0e8_12%,transparent)] bg-[color-mix(in_oklab,#f3f0e8_3%,transparent)] p-[1.1rem]">
                      <p className="m-0 font-heading text-[1.05rem] leading-[1.35] tracking-[-0.02em]">
                        {method.demo}
                      </p>
                      <span className="mt-[0.85rem] inline-block text-[0.65rem] tracking-[0.12em] text-[#d6ff3c] uppercase">
                        Generating your vision
                      </span>
                    </div>
                  ) : null}
                  {method.type === "draw" ? (
                    <div className="text-[#d6ff3c] opacity-90" aria-hidden="true">
                      <svg className="h-auto w-full" viewBox="0 0 400 220" fill="none">
                        <path
                          d="M48 168C96 62 168 38 214 118C248 176 312 158 352 48"
                          stroke="currentColor"
                          strokeWidth="2.5"
                        />
                        <path
                          d="M64 188C118 108 172 96 214 152C248 196 300 172 328 108"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          opacity="0.45"
                        />
                      </svg>
                    </div>
                  ) : null}
                  {method.type === "hybrid" && method.demo ? (
                    <div className="flex items-center gap-[0.85rem] font-heading text-[1.4rem] font-bold tracking-[-0.03em]">
                      <span>ROUGH</span>
                      <span className="text-[#d6ff3c]">→</span>
                      <span>READY</span>
                    </div>
                  ) : null}
                  <div>
                    <p className="mb-[0.45rem] text-[0.68rem] tracking-[0.14em] text-[#d6ff3c] uppercase">
                      {method.eyebrow}
                    </p>
                    <h3 className="m-0 max-w-[12ch] font-heading text-[clamp(1.45rem,2.8vw,1.85rem)] font-bold leading-[1.1] tracking-[-0.035em]">
                      {method.title}
                    </h3>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section
            ref={audienceSection}
            className="relative border-t border-[color-mix(in_oklab,#f3f0e8_12%,transparent)]"
            aria-label="Who it's for"
          >
            <div
              className={cn(
                "relative overflow-clip pt-[5.5rem] pb-14",
                padX,
                "bg-[radial-gradient(ellipse_55%_50%_at_85%_45%,color-mix(in_oklab,#d6ff3c_10%,transparent),transparent_70%),#070807]",
              )}
            >
              <div className="relative z-[1] w-full max-w-[40rem]">
                <p className="mb-4 text-[0.7rem] tracking-[0.16em] text-[#d6ff3c] uppercase">
                  Who it&apos;s for
                </p>
                <div className="mb-8 flex flex-wrap gap-x-4 gap-y-[0.55rem]">
                  {audiences.map((item, index) => (
                    <button
                      key={item.label}
                      type="button"
                      className={cn(
                        "appearance-none border-0 bg-transparent p-0 font-heading text-[0.72rem] font-bold tracking-[0.14em] uppercase transition-colors duration-[350ms]",
                        activeAudience === index
                          ? "text-[#d6ff3c]"
                          : "text-[color-mix(in_oklab,#f3f0e8_40%,transparent)]",
                      )}
                      aria-pressed={activeAudience === index}
                      onClick={() => {
                        setActiveAudience(index);
                        document
                          .getElementById(`audience-${item.label.toLowerCase()}`)
                          ?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <div className="grid w-full gap-12 md:gap-14">
                  {audiences.map((item, index) => (
                    <article
                      key={item.number}
                      id={`audience-${item.label.toLowerCase()}`}
                      className="grid w-full gap-5"
                    >
                      <div>
                        <span className="mb-[0.65rem] block font-heading text-[0.72rem] font-bold tracking-[0.16em] text-[color-mix(in_oklab,#f3f0e8_45%,transparent)]">
                          {item.number}
                        </span>
                        <h2 className="m-0 max-w-[14ch] font-heading text-[clamp(1.85rem,4.5vw,3rem)] font-bold leading-[1.05] tracking-[-0.045em]">
                          {item.title}
                        </h2>
                        <p className="mt-4 mb-0 max-w-[34ch] leading-[1.55] text-[#c8c4b8]">
                          {item.body}
                        </p>
                      </div>
                      <div
                        className={cn(
                          "relative m-0 min-h-56 w-full overflow-hidden border border-[color-mix(in_oklab,#f3f0e8_12%,transparent)] md:min-h-72",
                          "bg-[linear-gradient(160deg,#141714_0%,#0c0e0c_55%,color-mix(in_oklab,#d6ff3c_8%,#0c0e0c)_100%)]",
                        )}
                        aria-hidden="true"
                      >
                        <AudienceArt
                          active={index}
                          only={index}
                          reducedMotion={reducedMotion}
                          stacked
                        />
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section
            id="pricing"
            className={cn(
              "border-t border-[color-mix(in_oklab,#f3f0e8_12%,transparent)] py-[clamp(4.5rem,10vh,7rem)]",
              padX,
            )}
          >
            <div
              className="mb-[clamp(2rem,4vw,3rem)] max-w-[36rem]"
              data-reveal
            >
              <div className="mb-6 flex items-center gap-3 text-[0.7rem] tracking-[0.16em] text-[#c8c4b8] uppercase">
                <span className="text-[#d6ff3c]">03</span>
                <span>Pricing &amp; proof</span>
              </div>
              <h2 className="mb-4 font-heading text-[clamp(2.1rem,5vw,3.5rem)] font-bold leading-[1.02] tracking-[-0.045em]">
                Transparent price.
                <br />
                Street-ready print.
              </h2>
              <p className="m-0 max-w-[42ch] leading-[1.55] text-[#c8c4b8]">
                Smart pricing weighs garment, print method and delivery so you see
                one clear total—before you pay. DTF and screen printing available
                now.
              </p>
            </div>
            <div className="grid gap-px border border-[color-mix(in_oklab,#f3f0e8_12%,transparent)] bg-[color-mix(in_oklab,#f3f0e8_12%,transparent)] md:grid-cols-3">
              {(
                [
                  ["₦", "Instant pricing", "Totals update as you change quality, print and quantity."],
                  ["07", "Days to your door", "Printed, checked and delivered across Nigeria."],
                  ["1", "Piece minimum", "No bulk required. One idea is enough to begin."],
                ] as const
              ).map(([num, title, body]) => (
                <article
                  key={title}
                  className="min-h-44 bg-[#070807] px-[1.4rem] py-[1.6rem]"
                  data-reveal
                >
                  <span className="mb-[1.1rem] block font-heading text-[2.4rem] font-extrabold leading-none tracking-[-0.05em] text-[#d6ff3c]">
                    {num}
                  </span>
                  <h3 className="mb-[0.45rem] font-heading text-[1.2rem] font-bold tracking-[-0.03em]">
                    {title}
                  </h3>
                  <p className="m-0 max-w-[28ch] text-[0.92rem] leading-[1.5] text-[#c8c4b8]">
                    {body}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section
            className={cn(
              "border-t border-[color-mix(in_oklab,#f3f0e8_12%,transparent)] py-10",
              padX,
            )}
            data-reveal
          >
            <p className="m-0 max-w-[40rem] text-[0.95rem] leading-[1.55] text-[#c8c4b8]">
              Made with vetted production partners. Quality-checked before it
              ships. Built for creatives across Nigeria.
            </p>
          </section>

          <section
            className={cn(
              "border-t border-[color-mix(in_oklab,#f3f0e8_12%,transparent)] py-[clamp(4.5rem,12vh,8rem)]",
              padX,
              "bg-[radial-gradient(ellipse_60%_50%_at_50%_100%,rgba(214,255,60,0.08),transparent_60%),#070807]",
            )}
          >
            <div data-reveal>
              <p className="mb-3 text-[0.7rem] tracking-[0.16em] text-[#d6ff3c] uppercase">
                Your blank canvas is waiting.
              </p>
              <h2 className="m-0 max-w-full font-heading text-[clamp(2.35rem,10vw,5.5rem)] font-extrabold leading-[0.95] tracking-[-0.055em]">
                What will
                <br />
                you wear next?
              </h2>
            </div>
            <div
              className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-4"
              data-reveal
            >
              <a
                href="/dashboard"
                className="inline-flex w-full items-center justify-center gap-[0.45rem] rounded-[2px] bg-[#d6ff3c] px-6 py-[1.05rem] text-[0.9rem] font-bold tracking-[0.04em] text-[#070807] uppercase transition-[transform,background] duration-[250ms] hover:-translate-y-px hover:bg-[color-mix(in_oklab,#d6ff3c_88%,white)] sm:w-auto [&_svg]:text-[#070807]"
              >
                Start designing
                <ArrowUpRight size={18} strokeWidth={2.25} />
              </a>
              <a
                href="/dashboard"
                className="inline-flex w-fit items-center gap-[0.4rem] border-b border-[color-mix(in_oklab,#f3f0e8_35%,transparent)] pb-[0.2rem] text-[0.78rem] tracking-[0.08em] text-[#c8c4b8] uppercase transition-colors hover:text-[#f3f0e8]"
              >
                Continue as guest
              </a>
            </div>
            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-[0.78rem] text-[#c8c4b8]">
              {(
                [
                  "No design skills needed",
                  "Guest checkout",
                  "One piece minimum",
                ] as const
              ).map((label) => (
                <span key={label} className="inline-flex items-center gap-[0.4rem]">
                  <Plus size={14} strokeWidth={2.5} className="text-[#d6ff3c]" />
                  {label}
                </span>
              ))}
            </div>
          </section>
        </div>
      </main>

      <footer
        className={cn(
          "grid gap-4 border-t border-[color-mix(in_oklab,#f3f0e8_12%,transparent)] pt-10 pb-8 text-[0.85rem] text-[#c8c4b8]",
          padX,
          "md:grid-cols-[1fr_auto] md:items-end",
        )}
      >
        <a
          href="#"
          className="font-heading text-[1.05rem] font-bold tracking-[-0.04em] text-[#f3f0e8] lowercase"
        >
          promptwear
        </a>
        <p className="m-0">Ideas deserve a body.</p>
        <div className="flex flex-wrap gap-x-6 gap-y-4">
          <a href="mailto:hello@promptwear.ng">hello@promptwear.ng</a>
          <a href="#how">How it works</a>
          <a href="#pricing">Pricing</a>
        </div>
        <small className="opacity-65">© 2026 Promptwear</small>
      </footer>
    </div>
  );
}
