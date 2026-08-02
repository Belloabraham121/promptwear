"use client";

import { useEffect, useRef, useState } from "react";

type IntroLoaderProps = {
  ready: boolean;
  reducedMotion?: boolean;
  onComplete: () => void;
};

const SCRIBBLES = [
  "M2 18 C10 4 22 4 30 16 S48 28 58 12",
  "M4 8 C16 22 28 2 44 18 S62 8 70 20",
  "M6 22 C14 8 26 28 40 10 S58 24 66 6",
  "M2 12 C18 2 24 26 42 14 S60 4 72 18",
  "M8 6 C20 18 32 6 48 22 S64 10 68 16",
  "M4 20 C12 6 30 24 46 8 S58 22 70 10",
  "M10 14 C22 4 34 22 50 10 S62 26 74 12",
  "M2 10 C16 24 28 6 44 20 S56 2 68 14",
  "M6 18 C18 28 30 4 46 16 S60 28 72 8",
  "M4 6 C14 16 26 8 40 24 S54 6 66 18",
  "M8 22 C20 10 36 26 52 12 S64 20 70 6",
  "M2 16 C12 4 28 20 44 6 S58 18 74 22",
];

/** Start offsets in vw / vh — fly inward to center */
const STARTS = [
  { x: -44, y: -40, r: -28 },
  { x: 46, y: -42, r: 22 },
  { x: -48, y: 14, r: 16 },
  { x: 50, y: 20, r: -18 },
  { x: -16, y: -46, r: 30 },
  { x: 20, y: 44, r: -24 },
  { x: -44, y: 38, r: 12 },
  { x: 42, y: -18, r: -14 },
  { x: 6, y: -48, r: 20 },
  { x: -28, y: 46, r: -30 },
  { x: 48, y: 34, r: 10 },
  { x: -10, y: 42, r: -8 },
];

export function IntroLoader({
  ready,
  reducedMotion = false,
  onComplete,
}: IntroLoaderProps) {
  const [phase, setPhase] = useState<
    "scatter" | "converge" | "brand" | "hold" | "exit"
  >(reducedMotion ? "brand" : "scatter");
  const finished = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, []);

  // Choreography: scatter → converge → brand → hold for scene → exit
  useEffect(() => {
    if (reducedMotion) {
      const t = window.setTimeout(() => setPhase("hold"), 400);
      return () => window.clearTimeout(t);
    }

    const t1 = window.setTimeout(() => setPhase("converge"), 180);
    const t2 = window.setTimeout(() => setPhase("brand"), 1400);
    const t3 = window.setTimeout(() => setPhase("hold"), 2400);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [reducedMotion]);

  useEffect(() => {
    if (phase !== "hold" || !ready || finished.current) return;

    const t = window.setTimeout(
      () => {
        setPhase("exit");
      },
      reducedMotion ? 200 : 550,
    );
    return () => window.clearTimeout(t);
  }, [phase, ready, reducedMotion]);

  useEffect(() => {
    if (phase !== "exit" || finished.current) return;

    const t = window.setTimeout(() => {
      if (finished.current) return;
      finished.current = true;
      document.documentElement.style.overflow = "";
      onCompleteRef.current();
    }, reducedMotion ? 350 : 750);

    return () => window.clearTimeout(t);
  }, [phase, reducedMotion]);

  // Fail-safe
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (finished.current) return;
      finished.current = true;
      document.documentElement.style.overflow = "";
      onCompleteRef.current();
    }, 10000);
    return () => window.clearTimeout(t);
  }, []);

  const converged = phase === "converge" || phase === "brand" || phase === "hold";
  const showBrand = phase === "brand" || phase === "hold" || phase === "exit";
  const exiting = phase === "exit";

  return (
    <div
      className={[
        "fixed inset-0 z-[60] flex items-center justify-center overflow-hidden bg-[#070807]",
        "transition-opacity duration-700 ease-in-out",
        exiting ? "opacity-0" : "opacity-100",
      ].join(" ")}
      role="status"
      aria-live="polite"
      aria-busy={phase !== "exit"}
      aria-label="Loading Promptwear"
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 55% 45% at 50% 48%, rgba(214,255,60,0.14), transparent 70%)",
        }}
      />

      {/* Scribbles */}
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        {SCRIBBLES.map((d, i) => {
          const start = STARTS[i % STARTS.length];
          return (
            <svg
              key={i}
              viewBox="0 0 76 32"
              className={[
                "absolute h-8 w-20 text-[#d6ff3c] md:h-10 md:w-28",
                "transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)]",
                exiting
                  ? "opacity-0"
                  : converged
                    ? "opacity-30"
                    : "opacity-90",
              ].join(" ")}
              style={{
                transitionDelay: exiting
                  ? `${i * 12}ms`
                  : converged
                    ? `${i * 45}ms`
                    : `${i * 30}ms`,
                transform: exiting
                  ? "translate(0px, 0px) rotate(0deg) scale(0.45)"
                  : converged
                    ? "translate(0px, 0px) rotate(0deg) scale(1)"
                    : `translate(${start.x}vw, ${start.y}vh) rotate(${start.r}deg) scale(1.1)`,
              }}
              fill="none"
              aria-hidden="true"
            >
              <path
                d={d}
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          );
        })}
      </div>

      {/* Center mark */}
      <div
        className={[
          "relative z-10 flex flex-col items-center px-6",
          "transition-all duration-500 ease-out",
          exiting ? "-translate-y-8 opacity-0" : "translate-y-0 opacity-100",
        ].join(" ")}
      >
        <div
          className={[
            "absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#d6ff3c]/55 md:h-52 md:w-52",
            "transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
            showBrand || converged
              ? "scale-100 opacity-100"
              : "scale-50 opacity-0",
            exiting ? "scale-150 opacity-0" : "",
          ].join(" ")}
          aria-hidden="true"
        />
        <div
          className={[
            "absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#f3f0e8]/20 md:h-36 md:w-36",
            "transition-all delay-75 duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
            showBrand || converged
              ? "scale-100 opacity-100"
              : "scale-40 opacity-0",
            exiting ? "scale-125 opacity-0" : "",
          ].join(" ")}
          aria-hidden="true"
        />

        <h1 className="relative font-[family-name:var(--font-display)] text-[clamp(2.4rem,8vw,5.5rem)] font-extrabold lowercase tracking-[-0.06em] text-[#f3f0e8]">
          {"promptwear".split("").map((letter, i) => (
            <span
              key={`${letter}-${i}`}
              className="inline-block overflow-hidden align-bottom"
            >
              <span
                className={[
                  "inline-block transition-all duration-500 ease-out",
                  showBrand
                    ? "translate-y-0 opacity-100"
                    : "translate-y-[110%] opacity-0",
                ].join(" ")}
                style={{ transitionDelay: showBrand ? `${i * 45}ms` : "0ms" }}
              >
                {letter}
              </span>
            </span>
          ))}
          <span
            className={[
              "ml-1 inline-block h-[0.85em] w-[0.08em] translate-y-[0.08em] bg-[#d6ff3c] align-baseline",
              "transition-opacity duration-300",
              showBrand && !exiting ? "animate-pulse opacity-100" : "opacity-0",
            ].join(" ")}
            aria-hidden="true"
          />
        </h1>

        <p
          className={[
            "mt-4 font-[family-name:var(--font-body)] text-[0.68rem] uppercase tracking-[0.22em] text-[#c8c4b8]",
            "transition-opacity duration-500",
            showBrand ? "opacity-70" : "opacity-0",
          ].join(" ")}
        >
          {ready ? "Canvas ready" : "Loading your canvas"}
        </p>
      </div>
    </div>
  );
}
