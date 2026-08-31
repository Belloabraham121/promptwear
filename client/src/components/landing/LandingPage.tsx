"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  Menu,
  PenTool,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

function formatNaira(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

const padX = "px-[clamp(1.15rem,4vw,3.5rem)]";

const trustChecks = [
  "One piece minimum",
  "Delivered in 7 days",
  "Prompt, draw, or both",
];

const steps = [
  {
    number: "01",
    title: "Pick a tee",
    body: "Classic or oversized. Standard, premium, or heavy cotton. Start with one piece — no bulk order required.",
  },
  {
    number: "02",
    title: "Add your design",
    body: "Type a prompt, sketch by hand, or mix both. The studio keeps your mark in the work — AI just pushes it further.",
  },
  {
    number: "03",
    title: "We print & deliver",
    body: "DTF or screen print, quality-checked, then shipped across Nigeria. Door in seven days.",
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

type CatalogTag = "all" | "classic" | "oversized" | "campus" | "events";

const catalogFilters: { id: CatalogTag; label: string }[] = [
  { id: "all", label: "All" },
  { id: "classic", label: "Classic" },
  { id: "oversized", label: "Oversized" },
  { id: "campus", label: "Campus" },
  { id: "events", label: "Events" },
];

const products: {
  name: string;
  hint: string;
  from: number;
  tag: Exclude<CatalogTag, "all">;
  image: string;
  alt: string;
}[] = [
  {
    name: "Classic tee",
    hint: "Everyday cotton · DTF or screen",
    from: 7000,
    tag: "classic",
    image: "/landing/landing-tee-classic.jpg",
    alt: "White classic tee with a lime abstract chest print",
  },
  {
    name: "Oversized tee",
    hint: "Baggy street cut · premium blank",
    from: 9000,
    tag: "oversized",
    image: "/landing/landing-tee-oversized.jpg",
    alt: "Black oversized tee with a bone scribble print",
  },
  {
    name: "Campus drop",
    hint: "Crew matching · one idea, many sizes",
    from: 7000,
    tag: "campus",
    image: "/landing/landing-tee-campus.jpg",
    alt: "Lime campus tee with a black ink chest mark",
  },
  {
    name: "Event merch",
    hint: "Night-ready print · fast turnaround",
    from: 7000,
    tag: "events",
    image: "/landing/landing-tee-event.jpg",
    alt: "Bone event tee with a ticket-style chest drawing",
  },
];

const audiences = [
  {
    label: "Campus",
    title: "Crews that want the same fit.",
    body: "Department drops, hostel runs, friend groups matching without the group-chat design drama.",
  },
  {
    label: "Events",
    title: "Merch that shows up with the night.",
    body: "Concert kits, launch nights, tour drops — print for the room without waiting on an agency.",
  },
  {
    label: "Brands",
    title: "First collection energy.",
    body: "Starting a tee line or testing a drop? Sample-to-batch without the design invoice.",
  },
];

const marqueeItems = [
  "YOUR IDEA",
  "YOUR CANVAS",
  "YOUR FIT",
  "MADE IN NIGERIA",
  "DELIVERED IN 7 DAYS",
  "ONE PIECE MINIMUM",
];

const GARMENT = { classic: 4500, oversized: 6500 } as const;
const PRINT = { dtf: 2500, screen: 1800 } as const;

function LimeButton({
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
        "inline-flex items-center justify-center gap-2 rounded-full bg-[#d6ff3c] px-6 py-3 text-[0.82rem] font-bold tracking-[0.04em] text-[#070807] uppercase transition-[transform,background] duration-200 hover:-translate-y-px hover:bg-[color-mix(in_oklab,#d6ff3c_88%,white)] [&]:text-[#070807] [&_svg]:text-[#070807]",
        className,
      )}
    >
      {children}
    </Link>
  );
}

function QuotePanel() {
  const [garment, setGarment] = useState<keyof typeof GARMENT>("classic");
  const [print, setPrint] = useState<keyof typeof PRINT>("dtf");
  const [qty, setQty] = useState(1);

  const quote = useMemo(() => {
    const unit = GARMENT[garment] + PRINT[print];
    let subtotal = unit * qty;
    if (print === "screen" && qty < 12) subtotal += 12000;
    const delivery = qty >= 20 ? 4500 : 2500;
    return { unit, subtotal, delivery, total: subtotal + delivery };
  }, [garment, print, qty]);

  return (
    <div className="grid overflow-hidden rounded-2xl border border-[color-mix(in_oklab,#070807_12%,transparent)] bg-[#faf8f3] md:grid-cols-[1.1fr_0.9fr]">
      <div className="flex flex-col gap-6 p-6 sm:p-8">
        <div>
          <p className="m-0 text-[0.7rem] tracking-[0.16em] text-[#5a6b14] uppercase">
            Instant quote
          </p>
          <h3 className="mt-2 mb-0 font-heading text-[1.65rem] font-bold tracking-[-0.04em] text-[#070807]">
            See what it costs
          </h3>
          <p className="mt-2 mb-0 max-w-[40ch] text-[0.92rem] leading-[1.5] text-[#5a574f]">
            Totals update as you change cut, print, and quantity. Screen print
            adds a setup fee under 12 pieces.
          </p>
        </div>

        <fieldset className="m-0 min-w-0 border-0 p-0">
          <legend className="mb-2 text-[0.72rem] font-semibold tracking-[0.08em] text-[#5a574f] uppercase">
            Tee
          </legend>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["classic", "Classic"],
                ["oversized", "Oversized"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={garment === id}
                onClick={() => setGarment(id)}
                className={cn(
                  "rounded-full px-4 py-2 text-[0.8rem] font-semibold tracking-[0.02em] transition-colors",
                  garment === id
                    ? "bg-[#070807] text-[#f3f0e8]"
                    : "bg-[color-mix(in_oklab,#070807_6%,transparent)] text-[#070807] hover:bg-[color-mix(in_oklab,#070807_10%,transparent)]",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="m-0 min-w-0 border-0 p-0">
          <legend className="mb-2 text-[0.72rem] font-semibold tracking-[0.08em] text-[#5a574f] uppercase">
            Print
          </legend>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["dtf", "DTF"],
                ["screen", "Screen"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={print === id}
                onClick={() => setPrint(id)}
                className={cn(
                  "rounded-full px-4 py-2 text-[0.8rem] font-semibold tracking-[0.02em] transition-colors",
                  print === id
                    ? "bg-[#070807] text-[#f3f0e8]"
                    : "bg-[color-mix(in_oklab,#070807_6%,transparent)] text-[#070807] hover:bg-[color-mix(in_oklab,#070807_10%,transparent)]",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="grid gap-2">
          <span className="text-[0.72rem] font-semibold tracking-[0.08em] text-[#5a574f] uppercase">
            Quantity · {qty}
          </span>
          <input
            type="range"
            min={1}
            max={24}
            value={qty}
            onChange={(event) => setQty(Number(event.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[color-mix(in_oklab,#070807_12%,transparent)] accent-[#d6ff3c]"
          />
        </label>
      </div>

      <div className="flex flex-col justify-between gap-6 bg-[#070807] p-6 text-[#f3f0e8] sm:p-8">
        <div>
          <p className="m-0 text-[0.7rem] tracking-[0.14em] text-[#c8c4b8] uppercase">
            Your total
          </p>
          <p className="mt-3 mb-0 font-heading text-[clamp(2.4rem,6vw,3.4rem)] font-extrabold leading-none tracking-[-0.05em] text-[#d6ff3c]">
            {formatNaira(quote.total)}
          </p>
          <dl className="mt-5 grid gap-2 text-[0.88rem] text-[#c8c4b8]">
            <div className="flex justify-between gap-4">
              <dt>Print + blank</dt>
              <dd className="m-0 text-[#f3f0e8]">{formatNaira(quote.subtotal)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Delivery</dt>
              <dd className="m-0 text-[#f3f0e8]">{formatNaira(quote.delivery)}</dd>
            </div>
          </dl>
        </div>
        <LimeButton href="/dashboard" className="w-full">
          Start designing
          <ArrowUpRight size={16} strokeWidth={2.25} />
        </LimeButton>
      </div>
    </div>
  );
}

export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [filter, setFilter] = useState<CatalogTag>("all");
  const visibleProducts =
    filter === "all"
      ? products
      : products.filter((product) => product.tag === filter);

  return (
    <div className="min-h-dvh overflow-x-clip bg-[#f3f0e8] font-sans text-[#070807] [&_a]:no-underline">
      <header
        className={cn(
          "sticky top-0 z-40 grid grid-cols-[1fr_auto] items-center gap-4 border-b border-[color-mix(in_oklab,#070807_8%,transparent)] bg-[#f3f0e8]/92 py-3.5 backdrop-blur-md md:grid-cols-[1fr_auto_1fr]",
          padX,
        )}
      >
        <Link
          href="/"
          className="font-heading text-[1.12rem] font-bold tracking-[-0.04em] lowercase"
          aria-label="Promptwear home"
        >
          promptwear
        </Link>
        <nav
          className="hidden items-center gap-7 text-[0.78rem] tracking-[0.06em] text-[#5a574f] md:flex"
          aria-label="Main"
        >
          <a href="#how" className="transition-colors hover:text-[#070807]">
            How it works
          </a>
          <a href="#catalog" className="transition-colors hover:text-[#070807]">
            Catalog
          </a>
          <a href="#create" className="transition-colors hover:text-[#070807]">
            Create
          </a>
          <a href="#pricing" className="transition-colors hover:text-[#070807]">
            Pricing
          </a>
        </nav>
        <div className="hidden items-center justify-end gap-3 md:flex">
          <Link
            href="/login"
            className="inline-flex items-center rounded-full border border-[color-mix(in_oklab,#070807_22%,transparent)] px-4 py-2 text-[0.78rem] font-semibold tracking-[0.04em] text-[#070807] transition-colors hover:border-[#070807]"
          >
            Log in
          </Link>
          <LimeButton href="/dashboard" className="px-4 py-2">
            Sign up
          </LimeButton>
        </div>
        <button
          type="button"
          className="grid size-10 place-items-center justify-self-end rounded-full border border-[color-mix(in_oklab,#070807_22%,transparent)] bg-transparent text-[#070807] md:hidden"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {menuOpen ? (
        <nav
          className="fixed inset-0 z-30 flex flex-col justify-center gap-5 bg-[#f3f0e8] p-8 font-heading text-[clamp(2rem,8vw,3.4rem)] font-bold tracking-[-0.04em]"
          aria-label="Mobile"
        >
          <a href="#how" onClick={() => setMenuOpen(false)}>
            How it works
          </a>
          <a href="#catalog" onClick={() => setMenuOpen(false)}>
            Catalog
          </a>
          <a href="#create" onClick={() => setMenuOpen(false)}>
            Create
          </a>
          <a href="#pricing" onClick={() => setMenuOpen(false)}>
            Pricing
          </a>
          <Link href="/dashboard" onClick={() => setMenuOpen(false)}>
            Start designing
          </Link>
        </nav>
      ) : null}

      <main>
        <section className={cn("relative bg-[#070807] pt-10 pb-0 text-[#f3f0e8] md:pt-16", padX)}>
          <div className="mx-auto flex max-w-[46rem] flex-col items-center text-center">
            <h1 className="m-0 font-heading text-[clamp(2.35rem,8vw,4.6rem)] font-extrabold leading-[0.94] tracking-[-0.055em] text-[#c9dc4a]">
              Create custom tees
              <br />
              from a thought.
            </h1>
            <ul className="mt-6 mb-0 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 p-0 text-[0.92rem] text-[#c9dc4a]">
              {trustChecks.map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <Check size={16} strokeWidth={2.75} className="text-[#d6ff3c]" />
                  {item}
                </li>
              ))}
            </ul>
            <LimeButton href="/dashboard" className="mt-7 px-7 py-3.5 text-[0.88rem]">
              Start designing
              <ArrowUpRight size={17} strokeWidth={2.25} />
            </LimeButton>
            <p className="mt-3 mb-0 text-[0.78rem] text-[#8a867c]">
              No credit card required · guest checkout
            </p>
          </div>

          <div className="relative mx-auto mt-10 max-w-[68rem] md:mt-14">
            <div className="grid overflow-hidden rounded-t-2xl bg-[#f3f0e8] shadow-[0_24px_80px_rgba(0,0,0,0.35)] md:grid-cols-2">
              <figure className="relative m-0 aspect-[4/3] bg-[#f0c4a8]">
                <Image
                  src="/landing/landing-hero-editor.jpg"
                  alt="Studio mockup of a white tee with a lime graphic in a design selection box"
                  fill
                  priority
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="object-cover"
                />
                <figcaption className="absolute bottom-3 left-3 rounded-full bg-[#070807]/88 px-3 py-1.5 text-[0.68rem] tracking-[0.1em] text-[#f3f0e8] uppercase">
                  Prompt + draw
                </figcaption>
              </figure>
              <figure className="relative m-0 aspect-[4/3] bg-[#1a1c18]">
                <Image
                  src="/landing/landing-hero-life.jpg"
                  alt="Finished custom white tee hanging in a sunlit room"
                  fill
                  priority
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="object-cover"
                />
                <span className="absolute top-4 right-4 rounded-full bg-[#d6ff3c] px-2.5 py-1 text-[0.68rem] font-bold tracking-[0.08em] text-[#070807] uppercase">
                  Ready
                </span>
                <figcaption className="absolute right-4 bottom-4 rounded-md bg-[#070807] px-3 py-2 text-[0.68rem] tracking-[0.12em] text-[#f3f0e8] uppercase">
                  Ordered · 7 days
                </figcaption>
              </figure>
            </div>
          </div>

          <p className="mx-auto max-w-[68rem] py-5 text-center text-[0.78rem] tracking-[0.04em] text-[#8a867c]">
            Quality-checked before it ships · Vetted Nigerian production partners
          </p>
        </section>

        <div
          className="overflow-hidden border-y border-[color-mix(in_oklab,#070807_10%,transparent)] bg-[#070807] py-3.5 text-[#f3f0e8]"
          aria-hidden="true"
        >
          <div className="pw-marquee-track flex w-max gap-8 font-heading text-[clamp(0.9rem,2vw,1.1rem)] font-bold tracking-[0.12em] uppercase whitespace-nowrap">
            {[...marqueeItems, ...marqueeItems].map((item, index) => (
              <span key={`${item}-${index}`} className="inline-flex items-center">
                {item}
                <i className="ml-8 not-italic text-[#d6ff3c]">/</i>
              </span>
            ))}
          </div>
        </div>

        <section id="how" className={cn("bg-[#f3f0e8] py-[clamp(4rem,9vh,6.5rem)]", padX)}>
          <div className="mx-auto max-w-[68rem]">
            <div className="max-w-[36rem]">
              <p className="m-0 text-[0.7rem] tracking-[0.16em] text-[#5a6b14] uppercase">
                How it works
              </p>
              <h2 className="mt-3 mb-0 font-heading text-[clamp(2rem,4.8vw,3.4rem)] font-bold leading-[1.04] tracking-[-0.045em]">
                Start with one idea.
              </h2>
              <p className="mt-3 mb-0 max-w-[42ch] leading-[1.55] text-[#5a574f]">
                We are not a bulk merch factory. Promptwear is for original tees —
                a thought, a sketch, a small drop — printed and delivered.
              </p>
            </div>

            <ol className="mt-10 grid list-none gap-px border border-[color-mix(in_oklab,#070807_12%,transparent)] bg-[color-mix(in_oklab,#070807_12%,transparent)] p-0 md:grid-cols-3">
              {steps.map((step) => (
                <li key={step.number} className="bg-[#faf8f3] p-6 sm:p-7">
                  <span className="font-heading text-[2rem] font-extrabold leading-none tracking-[-0.05em] text-[#5a6b14]">
                    {step.number}
                  </span>
                  <h3 className="mt-4 mb-2 font-heading text-[1.35rem] font-bold tracking-[-0.03em]">
                    {step.title}
                  </h3>
                  <p className="m-0 max-w-[32ch] text-[0.95rem] leading-[1.55] text-[#5a574f]">
                    {step.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="catalog" className={cn("bg-[#f3f0e8] pb-[clamp(4rem,9vh,6.5rem)]", padX)}>
          <div className="mx-auto max-w-[68rem]">
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div className="max-w-[36rem]">
                <p className="m-0 text-[0.7rem] tracking-[0.16em] text-[#5a6b14] uppercase">
                  Catalog
                </p>
                <h2 className="mt-3 mb-0 font-heading text-[clamp(2rem,4.8vw,3.4rem)] font-bold leading-[1.04] tracking-[-0.045em]">
                  Your next original awaits
                </h2>
              </div>
              <div className="flex flex-wrap gap-2" role="tablist" aria-label="Catalog filter">
                {catalogFilters.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={filter === item.id}
                    onClick={() => setFilter(item.id)}
                    className={cn(
                      "rounded-full px-4 py-2 text-[0.78rem] font-semibold tracking-[0.04em] transition-colors",
                      filter === item.id
                        ? "bg-[#070807] text-[#f3f0e8]"
                        : "bg-[color-mix(in_oklab,#070807_6%,transparent)] text-[#5a574f] hover:text-[#070807]",
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {visibleProducts.map((product) => (
                <article
                  key={product.name}
                  className="group overflow-hidden rounded-2xl border border-[color-mix(in_oklab,#070807_10%,transparent)] bg-[#faf8f3] transition-transform duration-200 hover:-translate-y-0.5"
                >
                  <div className="relative aspect-square bg-[#ece8de]">
                    <Image
                      src={product.image}
                      alt={product.alt}
                      fill
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex items-start justify-between gap-3 p-4">
                    <div>
                      <h3 className="m-0 font-heading text-[1.05rem] font-bold tracking-[-0.03em]">
                        {product.name}
                      </h3>
                      <p className="mt-1 mb-0 text-[0.8rem] text-[#5a574f]">
                        {product.hint}
                      </p>
                    </div>
                    <p className="m-0 shrink-0 text-[0.82rem] font-semibold text-[#5a6b14]">
                      from {formatNaira(product.from)}
                    </p>
                  </div>
                  <div className="px-4 pb-4">
                    <Link
                      href="/dashboard"
                      className="inline-flex items-center gap-1 text-[0.75rem] font-bold tracking-[0.08em] text-[#070807] uppercase"
                    >
                      Design this
                      <ArrowUpRight size={14} strokeWidth={2.4} />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="create" className={cn("bg-[#f3f0e8] pb-[clamp(4rem,9vh,6.5rem)]", padX)}>
          <div className="mx-auto max-w-[68rem]">
            <div className="mb-8 max-w-[40rem]">
              <p className="m-0 text-[0.7rem] tracking-[0.16em] text-[#5a6b14] uppercase">
                Create your way
              </p>
              <h2 className="mt-3 mb-3 font-heading text-[clamp(2rem,4.8vw,3.4rem)] font-bold leading-[1.04] tracking-[-0.045em]">
                There is no wrong way to start.
              </h2>
              <p className="m-0 max-w-[42ch] leading-[1.55] text-[#5a574f]">
                A sentence, a scribble, a reference — or all three. AI augments
                your creativity. It never replaces it.
              </p>
            </div>

            <div className="grid gap-px overflow-hidden rounded-2xl border border-[color-mix(in_oklab,#070807_12%,transparent)] bg-[color-mix(in_oklab,#070807_12%,transparent)] md:grid-cols-3">
              {methods.map((method) => (
                <article
                  key={method.id}
                  className="flex min-h-[18rem] flex-col justify-between gap-8 bg-[#faf8f3] p-6"
                >
                  <span className="text-[0.7rem] tracking-[0.14em] text-[#5a574f]">
                    {method.id}
                  </span>
                  {method.type === "ai" && method.demo ? (
                    <div className="rounded-xl border border-[color-mix(in_oklab,#070807_12%,transparent)] bg-[color-mix(in_oklab,#070807_3%,transparent)] p-4">
                      <p className="m-0 font-heading text-[1.02rem] leading-[1.35] tracking-[-0.02em]">
                        {method.demo}
                      </p>
                      <span className="mt-3 inline-flex items-center gap-1.5 text-[0.65rem] tracking-[0.12em] text-[#5a6b14] uppercase">
                        <Sparkles size={12} />
                        Generating your vision
                      </span>
                    </div>
                  ) : null}
                  {method.type === "draw" ? (
                    <div className="text-[#5a6b14]" aria-hidden="true">
                      <svg className="h-auto w-full" viewBox="0 0 400 160" fill="none">
                        <path
                          d="M48 128C96 42 168 28 214 88C248 132 312 118 352 32"
                          stroke="currentColor"
                          strokeWidth="2.5"
                        />
                        <path
                          d="M64 140C118 78 172 70 214 110C248 142 300 124 328 78"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          opacity="0.45"
                        />
                      </svg>
                      <PenTool size={18} className="mt-2" />
                    </div>
                  ) : null}
                  {method.type === "hybrid" && method.demo ? (
                    <p className="m-0 font-heading text-[1.35rem] font-bold tracking-[-0.03em]">
                      ROUGH <span className="text-[#5a6b14]">→</span> READY
                    </p>
                  ) : null}
                  <div>
                    <p className="mb-1.5 text-[0.68rem] tracking-[0.14em] text-[#5a6b14] uppercase">
                      {method.eyebrow}
                    </p>
                    <h3 className="m-0 max-w-[12ch] font-heading text-[clamp(1.4rem,2.6vw,1.75rem)] font-bold leading-[1.1] tracking-[-0.035em]">
                      {method.title}
                    </h3>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          aria-label="Who it's for"
          className={cn("bg-[#f3f0e8] pb-[clamp(4rem,9vh,6.5rem)]", padX)}
        >
          <div className="mx-auto max-w-[68rem]">
            <p className="m-0 text-[0.7rem] tracking-[0.16em] text-[#5a6b14] uppercase">
              Who it&apos;s for
            </p>
            <h2 className="mt-3 mb-8 max-w-[16ch] font-heading text-[clamp(2rem,4.8vw,3.4rem)] font-bold leading-[1.04] tracking-[-0.045em]">
              Built for the drop, not the factory.
            </h2>
            <div className="grid gap-4 md:grid-cols-3">
              {audiences.map((item, index) => (
                <article
                  key={item.label}
                  className="rounded-2xl border border-[color-mix(in_oklab,#070807_10%,transparent)] bg-[#faf8f3] p-6"
                >
                  <span className="font-heading text-[0.72rem] font-bold tracking-[0.16em] text-[#5a6b14] uppercase">
                    {String(index + 1).padStart(2, "0")} · {item.label}
                  </span>
                  <h3 className="mt-4 mb-3 max-w-[14ch] font-heading text-[1.45rem] font-bold leading-[1.12] tracking-[-0.04em]">
                    {item.title}
                  </h3>
                  <p className="m-0 text-[0.95rem] leading-[1.55] text-[#5a574f]">
                    {item.body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className={cn("bg-[#f3f0e8] pb-[clamp(4rem,9vh,6.5rem)]", padX)}>
          <div className="mx-auto max-w-[68rem]">
            <div className="mb-8 max-w-[36rem]">
              <p className="m-0 text-[0.7rem] tracking-[0.16em] text-[#5a6b14] uppercase">
                Pricing
              </p>
              <h2 className="mt-3 mb-3 font-heading text-[clamp(2rem,4.8vw,3.4rem)] font-bold leading-[1.04] tracking-[-0.045em]">
                Transparent price.
                <br />
                Street-ready print.
              </h2>
              <p className="m-0 max-w-[42ch] leading-[1.55] text-[#5a574f]">
                Smart pricing weighs garment, print method and delivery so you see
                one clear total — before you pay.
              </p>
            </div>

            <div className="mb-6 grid gap-px overflow-hidden rounded-2xl border border-[color-mix(in_oklab,#070807_12%,transparent)] bg-[color-mix(in_oklab,#070807_12%,transparent)] md:grid-cols-3">
              {(
                [
                  ["₦", "Instant pricing", "Totals update as you change quality, print and quantity."],
                  ["07", "Days to your door", "Printed, checked and delivered across Nigeria."],
                  ["1", "Piece minimum", "No bulk required. One idea is enough to begin."],
                ] as const
              ).map(([num, title, body]) => (
                <article key={title} className="bg-[#faf8f3] px-6 py-7">
                  <span className="mb-4 block font-heading text-[2.3rem] font-extrabold leading-none tracking-[-0.05em] text-[#5a6b14]">
                    {num}
                  </span>
                  <h3 className="mb-2 font-heading text-[1.15rem] font-bold tracking-[-0.03em]">
                    {title}
                  </h3>
                  <p className="m-0 max-w-[28ch] text-[0.92rem] leading-[1.5] text-[#5a574f]">
                    {body}
                  </p>
                </article>
              ))}
            </div>

            <QuotePanel />
          </div>
        </section>

        <section
          className={cn(
            "bg-[#070807] py-[clamp(4.5rem,11vh,7.5rem)] text-[#f3f0e8]",
            padX,
          )}
        >
          <div className="mx-auto max-w-[68rem]">
            <p className="mb-3 text-[0.7rem] tracking-[0.16em] text-[#d6ff3c] uppercase">
              Your blank canvas is waiting.
            </p>
            <h2 className="m-0 max-w-[12ch] font-heading text-[clamp(2.4rem,8vw,5rem)] font-extrabold leading-[0.95] tracking-[-0.055em] text-[#c9dc4a]">
              What will you wear next?
            </h2>
            <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <LimeButton href="/dashboard" className="w-full px-7 py-3.5 text-[0.9rem] sm:w-auto">
                Start designing
                <ArrowUpRight size={18} strokeWidth={2.25} />
              </LimeButton>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1 border-b border-[color-mix(in_oklab,#f3f0e8_28%,transparent)] pb-0.5 text-[0.78rem] tracking-[0.08em] text-[#c8c4b8] uppercase hover:text-[#f3f0e8]"
              >
                Continue as guest
              </Link>
            </div>
            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-[0.78rem] text-[#c8c4b8]">
              {(
                [
                  "No design skills needed",
                  "Guest checkout",
                  "One piece minimum",
                ] as const
              ).map((label) => (
                <span key={label} className="inline-flex items-center gap-1.5">
                  <Plus size={14} strokeWidth={2.5} className="text-[#d6ff3c]" />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer
        className={cn(
          "grid gap-6 border-t border-[color-mix(in_oklab,#070807_10%,transparent)] bg-[#f3f0e8] pt-10 pb-8 text-[0.85rem] text-[#5a574f]",
          padX,
          "md:grid-cols-[1.2fr_1fr_1fr] md:items-start",
        )}
      >
        <div>
          <Link
            href="/"
            className="font-heading text-[1.1rem] font-bold tracking-[-0.04em] text-[#070807] lowercase"
          >
            promptwear
          </Link>
          <p className="mt-3 mb-0 max-w-[28ch] leading-[1.5]">
            Ideas deserve a body. Custom tees from prompt or drawing, made in
            Nigeria.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <p className="m-0 font-heading text-[0.72rem] font-bold tracking-[0.12em] text-[#070807] uppercase">
            Product
          </p>
          <a href="#how">How it works</a>
          <a href="#catalog">Catalog</a>
          <a href="#pricing">Pricing</a>
        </div>
        <div className="flex flex-col gap-2">
          <p className="m-0 font-heading text-[0.72rem] font-bold tracking-[0.12em] text-[#070807] uppercase">
            Studio
          </p>
          <Link href="/dashboard">Start designing</Link>
          <Link href="/login">Log in</Link>
          <a href="mailto:hello@promptwear.ng">hello@promptwear.ng</a>
          <small className="mt-4 opacity-70">© 2026 Promptwear</small>
        </div>
      </footer>
    </div>
  );
}
