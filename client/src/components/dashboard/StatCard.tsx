"use client";

import { useState } from "react";
import { Kicker } from "@/components/brand/ui";
import { formatCompact } from "@/lib/dashboard/pricing";
import { cn } from "@/lib/utils";

/**
 * Dashboard stat tile. Big numbers show short ("₦7.2M", "12K"); hovering shows
 * the exact figure as a tooltip, and tapping/clicking the value swaps between
 * short and exact so it works on touch screens too.
 *
 * Pass a number to have counts ≥ 1,000 shortened automatically, or pass a
 * preformatted short `value` with its `exact` form (e.g. money).
 */
export function StatCard({
  label,
  value,
  exact,
  hint,
}: {
  label: string;
  value: string | number;
  /** Full value revealed on hover/tap, e.g. "₦7,217,459". */
  exact?: string;
  hint?: string;
}) {
  const [showExact, setShowExact] = useState(false);

  const short = typeof value === "number" ? formatCompact(value) : value;
  const full =
    exact ?? (typeof value === "number" ? new Intl.NumberFormat("en-NG").format(value) : undefined);
  const expandable = full != null && full !== short;
  const shown = expandable && showExact ? full : short;

  // Sized to the card's own width (cqi) inside a fixed-height row, so the value
  // always fits, even two-up on a phone, and toggling never changes the card height.
  const valueClass = cn(
    "mt-4 mb-0 flex h-[2.6rem] items-end font-heading leading-none font-extrabold tracking-[-0.05em] whitespace-nowrap text-ink tabular-nums",
    String(shown).length > 7
      ? "text-[clamp(0.9rem,11cqi,1.75rem)]"
      : "text-[clamp(1.4rem,22cqi,2.6rem)]",
  );

  return (
    <article className="@container border border-ink/12 bg-paper p-5">
      <Kicker className="text-mute">{label}</Kicker>
      {expandable ? (
        <button
          type="button"
          onClick={() => setShowExact((v) => !v)}
          title={showExact ? `Show short: ${short}` : full}
          aria-label={`${label}: ${full}. ${showExact ? "Showing exact value" : `Shown as ${short}`}. Tap to switch.`}
          className={cn(
            valueClass,
            "cursor-pointer text-left decoration-ink/25 decoration-dotted underline-offset-[6px] hover:underline",
          )}
        >
          {shown}
        </button>
      ) : (
        <p className={valueClass}>{shown}</p>
      )}
      {hint || expandable ? (
        <p className="mt-3 mb-0 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-mute">
          {hint ? <span>{hint}</span> : <span />}
          {expandable ? (
            <span aria-hidden className="text-[0.6rem] font-semibold tracking-[0.16em] uppercase">
              {showExact ? "Show short" : "Show exact"}
            </span>
          ) : null}
        </p>
      ) : null}
    </article>
  );
}
