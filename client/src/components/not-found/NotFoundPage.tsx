import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";

const marqueeItems = [
  "PAGE NOT FOUND",
  "BLANK CANVAS",
  "WRONG TURN",
  "IDEA DESERVES A BODY",
  "TRY AGAIN",
  "PAGE NOT FOUND",
  "BLANK CANVAS",
  "WRONG TURN",
  "IDEA DESERVES A BODY",
  "TRY AGAIN",
];

export function NotFoundPage() {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-clip bg-[#070807] text-[#f3f0e8]">
      {/* Atmosphere */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_78%_38%,rgba(214,255,60,0.09),transparent_55%),radial-gradient(ellipse_50%_40%_at_12%_78%,rgba(80,100,90,0.2),transparent_50%),linear-gradient(165deg,#0c0e0b_0%,#070807_45%,#10140f_100%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-[10%] top-[8%] h-[55vmin] w-[55vmin] rounded-full bg-[radial-gradient(circle,rgba(214,255,60,0.14),transparent_68%)] blur-3xl motion-safe:animate-[nf-glow_8s_ease-in-out_infinite]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-[15%] bottom-[5%] h-[42vmin] w-[42vmin] rounded-full bg-[radial-gradient(circle,rgba(243,240,232,0.05),transparent_70%)] blur-3xl"
      />

      {/* Nav */}
      <header className="relative z-20 flex items-center justify-between px-[clamp(1.1rem,3vw,2.4rem)] py-5">
        <Link
          href="/"
          className="font-heading text-[1.05rem] font-bold tracking-[-0.04em] lowercase transition-opacity hover:opacity-80"
          aria-label="Promptwear home"
        >
          promptwear
        </Link>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 border-b border-current pb-0.5 text-[0.78rem] tracking-[0.06em] uppercase transition-opacity hover:opacity-80"
        >
          Start designing
          <ArrowUpRight size={15} strokeWidth={2.25} />
        </Link>
      </header>

      {/* Main composition */}
      <main className="relative z-10 flex flex-1 flex-col justify-end px-[clamp(1.1rem,3vw,2.4rem)] pb-10 pt-6 md:justify-center md:pb-16 md:pt-0">
        {/* Dominant 404 visual */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-[8%] flex justify-center md:top-[4%] md:justify-end md:pr-[4vw] lg:top-0"
        >
          <div className="relative select-none">
            <p className="font-heading text-[clamp(9rem,32vw,22rem)] font-extrabold leading-[0.82] tracking-[-0.08em] text-[#f3f0e8]/[0.07] motion-safe:animate-[nf-drift_12s_ease-in-out_infinite]">
              404
            </p>
            <svg
              className="absolute inset-x-[8%] top-[28%] h-auto w-[84%] text-[#d6ff3c] md:top-[34%]"
              viewBox="0 0 400 90"
              fill="none"
            >
              <path
                className="nf-stroke"
                d="M12 58C68 18 118 12 168 42C214 70 258 74 312 28C348 -2 372 18 388 48"
                stroke="currentColor"
                strokeWidth="2.25"
                strokeLinecap="round"
              />
              <path
                className="nf-stroke-soft"
                d="M28 72C90 36 140 30 186 54C228 76 270 68 318 42"
                stroke="currentColor"
                strokeWidth="1.25"
                opacity="0.4"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        <div className="relative max-w-[36rem] before:pointer-events-none before:absolute before:inset-[-22%_-12%_-30%_-10%] before:-z-10 before:bg-[radial-gradient(ellipse_at_28%_45%,color-mix(in_oklab,#070807_94%,transparent)_0%,color-mix(in_oklab,#070807_70%,transparent)_42%,transparent_72%)]">
          <p className="mb-4 font-heading text-[0.7rem] font-bold tracking-[0.16em] text-[#d6ff3c] uppercase motion-safe:animate-[nf-fade-up_0.7s_ease-out_both]">
            Error 404
          </p>

          <h1
            className="font-heading text-[clamp(2.75rem,9vw,6.25rem)] font-extrabold leading-[0.92] tracking-[-0.065em] lowercase motion-safe:animate-[nf-fade-up_0.85s_0.08s_ease-out_both]"
            aria-label="Promptwear"
          >
            promptwear
          </h1>

          <p className="mt-5 max-w-[18ch] font-heading text-[clamp(1.35rem,3.2vw,2rem)] font-semibold leading-[1.15] tracking-[-0.03em] motion-safe:animate-[nf-fade-up_0.85s_0.16s_ease-out_both]">
            This idea never got printed.
          </p>

          <p className="mt-3.5 max-w-[34ch] text-[0.98rem] leading-[1.55] text-[#c8c4b8] motion-safe:animate-[nf-fade-up_0.85s_0.24s_ease-out_both]">
            The page you&apos;re looking for isn&apos;t in the drop. Head home,
            or start designing something that is.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3 gap-x-4 motion-safe:animate-[nf-fade-up_0.85s_0.32s_ease-out_both]">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-[2px] bg-[#d6ff3c] px-5 py-3.5 text-[0.82rem] font-bold tracking-[0.04em] text-[#070807] uppercase transition-[transform,background] duration-250 hover:-translate-y-px hover:bg-[color-mix(in_oklab,#d6ff3c_88%,white)]"
            >
              <ArrowLeft size={16} strokeWidth={2.25} />
              Take me home
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 border-b border-[color-mix(in_oklab,#f3f0e8_35%,transparent)] pb-0.5 text-[0.78rem] tracking-[0.08em] text-[#c8c4b8] uppercase transition-colors hover:text-[#f3f0e8]"
            >
              Start designing
              <ArrowUpRight size={15} strokeWidth={2.25} />
            </Link>
          </div>
        </div>
      </main>

      {/* Marquee */}
      <div
        aria-hidden="true"
        className="relative z-10 overflow-hidden border-y border-[color-mix(in_oklab,#f3f0e8_12%,transparent)] py-3.5"
      >
        <div className="flex w-max gap-8 font-heading text-[clamp(0.95rem,2vw,1.15rem)] font-bold tracking-[0.12em] uppercase whitespace-nowrap motion-safe:animate-[nf-marquee_28s_linear_infinite]">
          {marqueeItems.map((item, index) => (
            <span key={`${item}-${index}`} className="inline-flex items-center">
              {item}
              <i className="ml-8 not-italic text-[#d6ff3c]">/</i>
            </span>
          ))}
        </div>
      </div>

      <footer className="relative z-10 flex flex-wrap items-end justify-between gap-3 px-[clamp(1.1rem,3vw,2.4rem)] py-5 text-[0.85rem] text-[#c8c4b8]">
        <p className="m-0">Ideas deserve a body.</p>
        <small className="opacity-65">© 2026 Promptwear</small>
      </footer>
    </div>
  );
}
