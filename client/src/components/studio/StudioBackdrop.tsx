"use client";

import type { StudioBackground } from "@/lib/dashboard/types";
import { STUDIO_BG } from "@/lib/studio/atlas";

/** Big perspective grid that starts high and curves down toward the viewer. */
function CurvedPerspectiveGrid() {
  const cols = 14;
  const rows = 12;
  const vpX = 50;
  const vpY = 8; // vanishing point near top

  const verticals = Array.from({ length: cols + 1 }, (_, i) => {
    const t = i / cols;
    const bottomX = -25 + t * 150;
    return { x1: vpX, y1: vpY, x2: bottomX, y2: 118 };
  });

  const arcs = Array.from({ length: rows }, (_, i) => {
    const t = (i + 1) / rows;
    const ease = t ** 1.35;
    const y = vpY + ease * (105 - vpY);
    const halfWidth = 8 + ease * 72;
    const bend = 2 + ease * 14;
    const x1 = vpX - halfWidth;
    const x2 = vpX + halfWidth;
    const c1x = vpX - halfWidth * 0.55;
    const c2x = vpX + halfWidth * 0.55;
    const cy = y + bend;
    return { x1, x2, y, c1x, c2x, cy, opacity: 0.18 + ease * 0.35 };
  });

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#070807]">
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(ellipse_80%_45%_at_50%_0%,rgba(214,255,60,0.07),transparent_55%),radial-gradient(ellipse_60%_50%_at_50%_100%,rgba(26,32,24,0.9),#070807)]"
      />

      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
      >
        <defs>
          <linearGradient id="pwGridFade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="white" stopOpacity="0" />
            <stop offset="18%" stopColor="white" stopOpacity="0.35" />
            <stop offset="55%" stopColor="white" stopOpacity="1" />
            <stop offset="100%" stopColor="white" stopOpacity="1" />
          </linearGradient>
          <mask id="pwGridMask">
            <rect width="100" height="100" fill="url(#pwGridFade)" />
          </mask>
        </defs>

        <g mask="url(#pwGridMask)" fill="none" strokeLinecap="round">
          {verticals.map((line, i) => (
            <line
              key={`v-${i}`}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke="rgba(214,255,60,0.22)"
              strokeWidth={0.18}
            />
          ))}
          {arcs.map((arc, i) => (
            <path
              key={`h-${i}`}
              d={`M ${arc.x1} ${arc.y} C ${arc.c1x} ${arc.cy}, ${arc.c2x} ${arc.cy}, ${arc.x2} ${arc.y}`}
              stroke={`rgba(243,240,232,${arc.opacity})`}
              strokeWidth={0.22 + (i / rows) * 0.2}
            />
          ))}
        </g>
      </svg>

      {/* Soft ground contact + vignette */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-[42%] bg-[radial-gradient(ellipse_70%_55%_at_50%_100%,rgba(0,0,0,0.55),transparent_70%)]"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(ellipse_45%_55%_at_50%_42%,transparent_0%,rgba(7,8,7,0.35)_70%,rgba(7,8,7,0.78)_100%)]"
      />
    </div>
  );
}

function DepthStudio({
  background,
}: {
  background: Exclude<StudioBackground, "grid">;
}) {
  const bg = STUDIO_BG[background];
  const isDark = background === "ink";

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0" style={{ background: bg.css }} />

      {/* Horizon / wall-floor break */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-[46%] h-px opacity-40"
        style={{
          background: isDark
            ? "linear-gradient(90deg, transparent, rgba(214,255,60,0.12), transparent)"
            : "linear-gradient(90deg, transparent, rgba(7,8,7,0.08), transparent)",
        }}
      />

      {/* Perspective floor plane hint */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-[-10%] bottom-0 h-[48%] origin-bottom"
        style={{
          background: bg.floor,
          transform: "perspective(900px) rotateX(52deg)",
          transformOrigin: "50% 100%",
        }}
      />

      {/* Soft key light bloom behind tee */}
      <div
        aria-hidden
        className={
          isDark
            ? "absolute left-1/2 top-[34%] h-[48%] w-[42%] -translate-x-1/2 rounded-[100%] bg-[radial-gradient(ellipse_at_center,rgba(214,255,60,0.07),transparent_68%)]"
            : "absolute left-1/2 top-[34%] h-[48%] w-[42%] -translate-x-1/2 rounded-[100%] bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.55),transparent_68%)]"
        }
      />

      {/* Ambient occlusion / vignette */}
      <div
        aria-hidden
        className={
          isDark
            ? "absolute inset-0 bg-[radial-gradient(ellipse_50%_58%_at_50%_40%,transparent_0%,rgba(7,8,7,0.25)_62%,rgba(7,8,7,0.72)_100%)]"
            : "absolute inset-0 bg-[radial-gradient(ellipse_52%_60%_at_50%_40%,transparent_0%,rgba(40,36,28,0.08)_58%,rgba(40,36,28,0.28)_100%)]"
        }
      />

      {/* Corner falloff */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(135deg,rgba(0,0,0,0.18),transparent_35%,transparent_65%,rgba(0,0,0,0.14))]"
      />
    </div>
  );
}

export function StudioBackdrop({
  background,
}: {
  background: StudioBackground;
}) {
  if (background === "grid") {
    return <CurvedPerspectiveGrid />;
  }

  return <DepthStudio background={background} />;
}
