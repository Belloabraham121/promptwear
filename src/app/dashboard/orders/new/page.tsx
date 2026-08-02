"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useDashboard } from "@/components/dashboard/DashboardProvider";
import {
  EmptyState,
  PageHeader,
  PrimaryLink,
} from "@/components/dashboard/ui";
import {
  emptySizes,
  formatNaira,
  quoteOrder,
  totalQuantity,
} from "@/lib/dashboard/pricing";
import {
  PRINT_LABELS,
  QUALITY_LABELS,
  SIZES,
  type GarmentQuality,
  type PrintMethod,
  type SizeBreakdown,
  type SizeKey,
} from "@/lib/dashboard/types";
import { cn } from "@/lib/utils";

function NewOrderForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { ready, designs, placeOrder } = useDashboard();

  const preset = searchParams.get("design") ?? "";
  const [designId, setDesignId] = useState(preset);
  const [quality, setQuality] = useState<GarmentQuality>("standard");
  const [print, setPrint] = useState<PrintMethod>("dtf");
  const [sizes, setSizes] = useState<SizeBreakdown>(emptySizes());
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!designId && designs[0]) {
      setDesignId(designs[0].id);
    }
  }, [designId, designs]);

  const design =
    designs.find((d) => d.id === designId) ?? designs[0] ?? null;

  const quote = useMemo(
    () => quoteOrder({ quality, print, sizes }),
    [quality, print, sizes],
  );

  function setSize(size: SizeKey, value: number) {
    setSizes((prev) => ({
      ...prev,
      [size]: Math.max(0, Math.min(500, value)),
    }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!design || quote.qty <= 0) return;
    setSubmitting(true);
    try {
      const order = await placeOrder(
        {
          designId: design.id,
          designTitle: design.title,
          color: design.color,
          quality,
          print,
          sizes,
        },
        note.trim() || undefined,
      );
      router.push(`/dashboard/orders/${order.id}`);
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready) {
    return <p className="text-sm text-[#c8c4b8]">Loading…</p>;
  }

  if (designs.length === 0) {
    return (
      <div>
        <PageHeader title="New order" />
        <EmptyState
          title="Save a design first"
          body="Orders start from a design in your studio. Create one, then come back to quote sizes and quality."
          action={<PrimaryLink href="/dashboard/studio">Open studio</PrimaryLink>}
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="New order"
        description="Choose a saved design, set sizes (bulk OK), cloth quality and print — quote updates live."
      />

      <form
        onSubmit={handleSubmit}
        className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)]"
      >
        <div className="space-y-6">
          <label className="block">
            <span className="text-[0.65rem] uppercase tracking-[0.14em] text-[#c8c4b8]">
              Design
            </span>
            <select
              value={design?.id ?? ""}
              onChange={(e) => setDesignId(e.target.value)}
              className="mt-2 w-full border border-[#f3f0e8]/15 bg-[#070807] px-3 py-3 text-sm outline-none focus:border-[#d6ff3c]"
            >
              {designs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </select>
          </label>

          <fieldset>
            <legend className="text-[0.65rem] uppercase tracking-[0.14em] text-[#c8c4b8]">
              Sizes & quantities
            </legend>
            <p className="mt-2 text-xs text-[#c8c4b8]">
              Add per-size counts. 20+ pieces unlocks a bulk break on the quote.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {SIZES.map((size) => (
                <label key={size} className="border border-[#f3f0e8]/12 p-3">
                  <span className="block text-xs text-[#c8c4b8]">{size}</span>
                  <input
                    type="number"
                    min={0}
                    max={500}
                    value={sizes[size]}
                    onChange={(e) =>
                      setSize(size, Number(e.target.value) || 0)
                    }
                    className="mt-2 w-full bg-transparent text-lg font-semibold outline-none"
                  />
                </label>
              ))}
            </div>
            <p className="mt-2 text-sm text-[#f3f0e8]">
              Total pieces:{" "}
              <span className="font-semibold text-[#d6ff3c]">
                {totalQuantity(sizes)}
              </span>
            </p>
          </fieldset>

          <fieldset>
            <legend className="text-[0.65rem] uppercase tracking-[0.14em] text-[#c8c4b8]">
              Cloth quality
            </legend>
            <div className="mt-3 grid gap-2">
              {(Object.keys(QUALITY_LABELS) as GarmentQuality[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setQuality(key)}
                  className={cn(
                    "border px-3 py-3 text-left text-sm transition",
                    quality === key
                      ? "border-[#d6ff3c] bg-[#d6ff3c]/10"
                      : "border-[#f3f0e8]/15 hover:border-[#f3f0e8]/35",
                  )}
                >
                  {QUALITY_LABELS[key]}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-[0.65rem] uppercase tracking-[0.14em] text-[#c8c4b8]">
              Print method
            </legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {(Object.keys(PRINT_LABELS) as PrintMethod[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPrint(key)}
                  className={cn(
                    "border px-3 py-3 text-left text-sm transition",
                    print === key
                      ? "border-[#d6ff3c] bg-[#d6ff3c]/10"
                      : "border-[#f3f0e8]/15 hover:border-[#f3f0e8]/35",
                  )}
                >
                  <span className="font-semibold">{PRINT_LABELS[key]}</span>
                  <span className="mt-1 block text-xs text-[#c8c4b8]">
                    {key === "screen"
                      ? "Best for bulk (setup under 12 pcs)"
                      : "Great for 1–50 pieces"}
                  </span>
                </button>
              ))}
            </div>
          </fieldset>

          <label className="block">
            <span className="text-[0.65rem] uppercase tracking-[0.14em] text-[#c8c4b8]">
              Order note (optional)
            </span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Delivery notes, event date, packing prefs…"
              className="mt-2 w-full resize-y border border-[#f3f0e8]/15 bg-transparent px-3 py-3 text-sm outline-none focus:border-[#d6ff3c]"
            />
          </label>
        </div>

        <aside className="h-fit border border-[#f3f0e8]/12 bg-[#0c0e0c] p-5 lg:sticky lg:top-24">
          <p className="text-[0.65rem] uppercase tracking-[0.14em] text-[#c8c4b8]">
            Live quote
          </p>
          <p className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold tracking-[-0.04em] text-[#d6ff3c]">
            {quote.qty > 0 ? formatNaira(quote.total) : "—"}
          </p>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-[#c8c4b8]">Subtotal</dt>
              <dd>{formatNaira(quote.subtotal)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[#c8c4b8]">Delivery</dt>
              <dd>{formatNaira(quote.delivery)}</dd>
            </div>
          </dl>
          {quote.qty >= 20 ? (
            <p className="mt-3 text-xs text-[#d6ff3c]">Bulk rate applied (20+)</p>
          ) : null}
          <button
            type="submit"
            disabled={submitting || quote.qty <= 0}
            className="mt-6 w-full bg-[#d6ff3c] px-4 py-3 text-xs font-bold uppercase tracking-[0.06em] text-[#070807] transition hover:bg-[#e2ff6a] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? "Placing…" : "Place quoted order"}
          </button>
        </aside>
      </form>
    </div>
  );
}

export default function NewOrderPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[#c8c4b8]">Loading…</p>}>
      <NewOrderForm />
    </Suspense>
  );
}
