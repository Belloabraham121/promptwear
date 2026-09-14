"use client";

import { cn } from "@/lib/utils";

export type GarmentKind = "tee" | "hoodie" | "tote" | "joggers" | "cap" | "polo";

const KEYWORDS: { kind: GarmentKind; words: string[] }[] = [
  { kind: "hoodie", words: ["hoodie", "hoody", "hooded", "sweatshirt", "pullover"] },
  { kind: "tote", words: ["tote", "tote bag", "shopping bag", "canvas bag"] },
  { kind: "joggers", words: ["jogger", "sweatpant", "sweat pant", "trouser", "pants", "shorts"] },
  { kind: "cap", words: ["cap", "hat", "beanie", "snapback", "dad hat"] },
  { kind: "polo", words: ["polo", "camp shirt", "collar shirt", "button shirt", "button-up"] },
];

/** Guess the garment from title/prompt text. Falls back to tee. */
export function detectGarment(text: string): GarmentKind {
  const lower = text.toLowerCase();
  for (const { kind, words } of KEYWORDS) {
    if (words.some((w) => lower.includes(w))) return kind;
  }
  return "tee";
}

const LABEL: Record<GarmentKind, string> = {
  tee: "Tee",
  hoodie: "Hoodie",
  tote: "Tote",
  joggers: "Joggers",
  cap: "Cap",
  polo: "Polo",
};

function Base({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <svg
      viewBox="0 0 120 120"
      role="img"
      aria-label={`${label} line art`}
      className="h-full w-full"
      fill="none"
      stroke="#0b1f1c"
      strokeWidth={3.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

const ART: Record<GarmentKind, (label: string) => React.ReactNode> = {
  tee: (label) => (
    <Base label={label}>
      <path d="M45 22 L60 30 L75 22 L92 32 L104 54 L90 62 L86 56 L86 102 L34 102 L34 56 L30 62 L16 54 L28 32 Z" />
      <path d="M45 22 Q60 34 75 22" />
    </Base>
  ),
  polo: (label) => (
    <Base label={label}>
      <path d="M45 22 L60 30 L75 22 L92 32 L104 54 L90 62 L86 56 L86 102 L34 102 L34 56 L30 62 L16 54 L28 32 Z" />
      <path d="M45 22 L52 34 L60 30 L68 34 L75 22" />
      <path d="M60 30 L60 52" />
    </Base>
  ),
  hoodie: (label) => (
    <Base label={label}>
      <path d="M42 48 L34 92 L38 102 L82 102 L86 92 L78 48" />
      <path d="M45 48 Q43 26 60 26 Q77 26 75 48" />
      <path d="M45 48 Q60 56 75 48" />
      <path d="M52 44 L50 60 M68 44 L70 60" />
      <path d="M48 76 L72 76 L68 96 L52 96 Z" />
    </Base>
  ),
  tote: (label) => (
    <Base label={label}>
      <path d="M38 48 L82 48 L78 102 L42 102 Z" />
      <path d="M48 48 Q47 24 60 24 Q73 24 72 48" />
      <path d="M38 58 L82 58" strokeWidth={2} opacity={0.45} />
    </Base>
  ),
  joggers: (label) => (
    <Base label={label}>
      <path d="M42 22 L78 22 L78 30 L42 30 Z" />
      <path d="M42 30 L58 30 L56 96 L44 96 Z" />
      <path d="M62 30 L78 30 L76 96 L64 96 Z" />
      <path d="M42 90 L56 90 M64 90 L78 90" strokeWidth={2} opacity={0.45} />
    </Base>
  ),
  cap: (label) => (
    <Base label={label}>
      <path d="M28 72 Q28 38 60 38 Q92 38 92 72 Z" />
      <path d="M60 38 L60 30" />
      <circle cx={60} cy={28} r={2.5} />
      <path d="M92 68 L112 76 L110 82 L92 78" />
      <path d="M44 44 Q52 60 50 72 M60 42 L60 72 M76 44 Q70 60 72 72" strokeWidth={2} opacity={0.45} />
    </Base>
  ),
};

export function GarmentArt({
  kind,
  className,
}: {
  kind: GarmentKind;
  className?: string;
}) {
  return <div className={cn("grid place-items-center", className)}>{ART[kind](LABEL[kind])}</div>;
}

export function ChatGarmentCard({
  title,
  text,
  method,
  messageCount,
  className,
}: {
  title: string;
  text: string;
  method: string;
  messageCount: number;
  className?: string;
}) {
  const kind = detectGarment(`${title} ${text}`);
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-[#0b1f1c]/10 bg-white shadow-[0_1px_2px_rgba(11,31,28,0.05)]",
        className,
      )}
    >
      <div className="relative grid aspect-[4/3] place-items-center bg-[#f3f0e8] p-6">
        <span className="absolute top-3 left-3 rounded-full bg-[#0b1f1c] px-2.5 py-1 text-[0.6rem] font-bold tracking-[0.12em] text-white uppercase">
          {LABEL[kind]}
        </span>
        <GarmentArt kind={kind} className="h-full max-h-36 w-auto" />
      </div>
      <div className="space-y-1 p-4">
        <p className="truncate text-sm font-semibold text-[#0b1f1c]">
          {title || "Untitled chat"}
        </p>
        <p className="text-xs text-[#52706a]">
          {method} · {messageCount} {messageCount === 1 ? "message" : "messages"}
        </p>
      </div>
    </div>
  );
}
