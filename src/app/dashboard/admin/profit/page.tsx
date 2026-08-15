"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAdmin } from "@/components/admin/AdminProvider";
import { PageHeader } from "@/components/dashboard/ui";
import { formatNaira } from "@/lib/dashboard/pricing";
import type { VendorSelectionStrategy } from "@/lib/admin/types";
import { SELECTION_STRATEGY_LABELS } from "@/lib/pricing/engine";
import { cn } from "@/lib/utils";

const STRATEGIES: VendorSelectionStrategy[] = [
  "lowest_cost",
  "highest_quality",
  "fastest_delivery",
];

export default function AdminProfitPage() {
  const {
    ready,
    profit,
    vendors,
    updateProfit,
    togglePromotion,
    addPromotion,
    toggleDiscount,
    addDiscount,
    toggleCoupon,
    addCoupon,
    removeCoupon,
  } = useAdmin();

  const [margin, setMargin] = useState(28);
  const [rush, setRush] = useState(38);
  const [minMargin, setMinMargin] = useState(15);
  const [maxMargin, setMaxMargin] = useState(45);
  const [strategy, setStrategy] =
    useState<VendorSelectionStrategy>("lowest_cost");
  const [overrideVendorId, setOverrideVendorId] = useState("");
  const [promoName, setPromoName] = useState("");
  const [promoDesc, setPromoDesc] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponValue, setCouponValue] = useState(10);

  useEffect(() => {
    if (!ready) return;
    setMargin(profit.defaultMarginPct);
    setRush(profit.rushMarginPct);
    setMinMargin(profit.minMarginPct);
    setMaxMargin(profit.maxMarginPct);
    setStrategy(profit.selectionStrategy);
    setOverrideVendorId(profit.overrideVendorId ?? "");
  }, [
    ready,
    profit.defaultMarginPct,
    profit.rushMarginPct,
    profit.minMarginPct,
    profit.maxMarginPct,
    profit.selectionStrategy,
    profit.overrideVendorId,
  ]);

  if (!ready) {
    return <p className="text-sm text-[#c8c4b8]">Loading profit settings…</p>;
  }

  async function savePricing(event: FormEvent) {
    event.preventDefault();
    await updateProfit({
      defaultMarginPct: margin,
      rushMarginPct: rush,
      minMarginPct: minMargin,
      maxMarginPct: maxMargin,
      selectionStrategy: strategy,
      overrideVendorId: overrideVendorId || null,
    });
  }

  async function toggleExclude(vendorId: string) {
    const set = new Set(profit.excludedVendorIds);
    if (set.has(vendorId)) set.delete(vendorId);
    else set.add(vendorId);
    await updateProfit({ excludedVendorIds: [...set] });
  }

  async function handlePromo(event: FormEvent) {
    event.preventDefault();
    if (!promoName.trim()) return;
    await addPromotion({ name: promoName, description: promoDesc });
    setPromoName("");
    setPromoDesc("");
  }

  async function handleCoupon(event: FormEvent) {
    event.preventDefault();
    if (!couponCode.trim()) return;
    await addCoupon({
      code: couponCode,
      type: "percent",
      value: couponValue,
    });
    setCouponCode("");
    setCouponValue(10);
  }

  return (
    <div>
      <PageHeader
        title="Profit & pricing"
        description="Margins, vendor selection rules, exclusions, and overrides for the smart pricing engine."
      />

      <form
        onSubmit={savePricing}
        className="mb-10 space-y-4 border border-[#f3f0e8]/12 p-5"
      >
        <h2 className="font-[family-name:var(--font-display)] text-xl font-bold tracking-[-0.03em]">
          Smart pricing controls
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="text-[0.65rem] uppercase tracking-[0.14em] text-[#c8c4b8]">
              Default margin %
            </span>
            <input
              type="number"
              min={0}
              max={90}
              value={margin}
              onChange={(e) => setMargin(Number(e.target.value))}
              className="mt-2 w-full border border-[#f3f0e8]/15 bg-transparent px-3 py-2.5 text-sm outline-none focus:border-[#d6ff3c]"
            />
          </label>
          <label className="block">
            <span className="text-[0.65rem] uppercase tracking-[0.14em] text-[#c8c4b8]">
              Rush margin %
            </span>
            <input
              type="number"
              min={0}
              max={90}
              value={rush}
              onChange={(e) => setRush(Number(e.target.value))}
              className="mt-2 w-full border border-[#f3f0e8]/15 bg-transparent px-3 py-2.5 text-sm outline-none focus:border-[#d6ff3c]"
            />
          </label>
          <label className="block">
            <span className="text-[0.65rem] uppercase tracking-[0.14em] text-[#c8c4b8]">
              Min margin %
            </span>
            <input
              type="number"
              min={0}
              max={90}
              value={minMargin}
              onChange={(e) => setMinMargin(Number(e.target.value))}
              className="mt-2 w-full border border-[#f3f0e8]/15 bg-transparent px-3 py-2.5 text-sm outline-none focus:border-[#d6ff3c]"
            />
          </label>
          <label className="block">
            <span className="text-[0.65rem] uppercase tracking-[0.14em] text-[#c8c4b8]">
              Max margin %
            </span>
            <input
              type="number"
              min={0}
              max={90}
              value={maxMargin}
              onChange={(e) => setMaxMargin(Number(e.target.value))}
              className="mt-2 w-full border border-[#f3f0e8]/15 bg-transparent px-3 py-2.5 text-sm outline-none focus:border-[#d6ff3c]"
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <fieldset>
            <legend className="text-[0.65rem] uppercase tracking-[0.14em] text-[#c8c4b8]">
              Prioritize
            </legend>
            <div className="mt-3 grid gap-2">
              {STRATEGIES.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStrategy(key)}
                  className={cn(
                    "border px-3 py-2.5 text-left text-sm",
                    strategy === key
                      ? "border-[#d6ff3c] bg-[#d6ff3c]/10"
                      : "border-[#f3f0e8]/15 hover:border-[#f3f0e8]/35",
                  )}
                >
                  {SELECTION_STRATEGY_LABELS[key]}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="block">
            <span className="text-[0.65rem] uppercase tracking-[0.14em] text-[#c8c4b8]">
              Override vendor (optional)
            </span>
            <select
              value={overrideVendorId}
              onChange={(e) => setOverrideVendorId(e.target.value)}
              className="mt-2 w-full border border-[#f3f0e8]/15 bg-[#070807] px-3 py-2.5 text-sm outline-none focus:border-[#d6ff3c]"
            >
              <option value="">Automatic selection</option>
              {vendors
                .filter((v) => v.active)
                .map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
            </select>
            <p className="mt-2 text-xs text-[#c8c4b8]">
              Forces this vendor when eligible, ignoring the strategy.
            </p>
          </label>
        </div>

        <div>
          <p className="text-[0.65rem] uppercase tracking-[0.14em] text-[#c8c4b8]">
            Temporarily exclude vendors
          </p>
          <ul className="mt-3 divide-y divide-[#f3f0e8]/10 border border-[#f3f0e8]/12">
            {vendors.map((v) => {
              const excluded = profit.excludedVendorIds.includes(v.id);
              return (
                <li
                  key={v.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">{v.name}</p>
                    <p className="text-xs text-[#c8c4b8]">{v.location}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void toggleExclude(v.id)}
                    className={cn(
                      "px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.08em]",
                      excluded
                        ? "bg-red-500/15 text-red-300"
                        : "bg-[#f3f0e8]/8 text-[#c8c4b8]",
                    )}
                  >
                    {excluded ? "Excluded" : "Include"}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <button
          type="submit"
          className="bg-[#d6ff3c] px-4 py-2.5 text-xs font-bold uppercase tracking-[0.06em] text-[#070807] hover:bg-[#e2ff6a]"
        >
          Save pricing rules
        </button>
      </form>

      <section className="mb-10">
        <h2 className="mb-4 font-[family-name:var(--font-display)] text-xl font-bold tracking-[-0.03em]">
          Promotions
        </h2>
        <form
          onSubmit={handlePromo}
          className="mb-4 grid gap-3 border border-[#f3f0e8]/12 p-4 sm:grid-cols-[1fr_1.4fr_auto]"
        >
          <input
            value={promoName}
            onChange={(e) => setPromoName(e.target.value)}
            placeholder="Name"
            className="border border-[#f3f0e8]/15 bg-transparent px-3 py-2.5 text-sm outline-none focus:border-[#d6ff3c]"
          />
          <input
            value={promoDesc}
            onChange={(e) => setPromoDesc(e.target.value)}
            placeholder="Description"
            className="border border-[#f3f0e8]/15 bg-transparent px-3 py-2.5 text-sm outline-none focus:border-[#d6ff3c]"
          />
          <button
            type="submit"
            className="border border-[#f3f0e8]/20 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] hover:border-[#d6ff3c] hover:text-[#d6ff3c]"
          >
            Add
          </button>
        </form>
        <ul className="divide-y divide-[#f3f0e8]/10 border border-[#f3f0e8]/12">
          {profit.promotions.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-start justify-between gap-3 px-4 py-4"
            >
              <div>
                <p className="font-medium">{p.name}</p>
                <p className="mt-1 text-sm text-[#c8c4b8]">{p.description}</p>
              </div>
              <button
                type="button"
                onClick={() => void togglePromotion(p.id)}
                className={cn(
                  "px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.08em]",
                  p.active
                    ? "bg-[#d6ff3c]/15 text-[#d6ff3c]"
                    : "bg-[#f3f0e8]/8 text-[#c8c4b8]",
                )}
              >
                {p.active ? "Live" : "Off"}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 font-[family-name:var(--font-display)] text-xl font-bold tracking-[-0.03em]">
          Volume discounts
        </h2>
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              void addDiscount({
                name: "Custom tier",
                type: "percent",
                value: 5,
                minQty: 10,
              })
            }
            className="border border-[#f3f0e8]/20 px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.08em] hover:border-[#d6ff3c] hover:text-[#d6ff3c]"
          >
            Add 5% @ 10 pcs
          </button>
        </div>
        <ul className="divide-y divide-[#f3f0e8]/10 border border-[#f3f0e8]/12">
          {profit.discounts.map((d) => (
            <li
              key={d.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-4"
            >
              <div>
                <p className="font-medium">{d.name}</p>
                <p className="mt-1 text-sm text-[#c8c4b8]">
                  {d.type === "percent" ? `${d.value}%` : formatNaira(d.value)}{" "}
                  off · min {d.minQty} pcs
                </p>
              </div>
              <button
                type="button"
                onClick={() => void toggleDiscount(d.id)}
                className={cn(
                  "px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.08em]",
                  d.active
                    ? "bg-[#d6ff3c]/15 text-[#d6ff3c]"
                    : "bg-[#f3f0e8]/8 text-[#c8c4b8]",
                )}
              >
                {d.active ? "Active" : "Off"}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-4 font-[family-name:var(--font-display)] text-xl font-bold tracking-[-0.03em]">
          Coupons
        </h2>
        <form
          onSubmit={handleCoupon}
          className="mb-4 grid gap-3 border border-[#f3f0e8]/12 p-4 sm:grid-cols-[1fr_8rem_auto]"
        >
          <input
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
            placeholder="CODE"
            className="border border-[#f3f0e8]/15 bg-transparent px-3 py-2.5 text-sm uppercase outline-none focus:border-[#d6ff3c]"
          />
          <input
            type="number"
            min={1}
            max={50}
            value={couponValue}
            onChange={(e) => setCouponValue(Number(e.target.value))}
            className="border border-[#f3f0e8]/15 bg-transparent px-3 py-2.5 text-sm outline-none focus:border-[#d6ff3c]"
          />
          <button
            type="submit"
            className="border border-[#f3f0e8]/20 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] hover:border-[#d6ff3c] hover:text-[#d6ff3c]"
          >
            Add % coupon
          </button>
        </form>
        <ul className="divide-y divide-[#f3f0e8]/10 border border-[#f3f0e8]/12">
          {profit.coupons.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-4"
            >
              <div>
                <p className="font-mono text-sm font-medium tracking-wide">
                  {c.code}
                </p>
                <p className="mt-1 text-sm text-[#c8c4b8]">
                  {c.type === "percent" ? `${c.value}%` : formatNaira(c.value)}{" "}
                  · {c.redemptions}/{c.maxRedemptions} used
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void toggleCoupon(c.id)}
                  className={cn(
                    "px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.08em]",
                    c.active
                      ? "bg-[#d6ff3c]/15 text-[#d6ff3c]"
                      : "bg-[#f3f0e8]/8 text-[#c8c4b8]",
                  )}
                >
                  {c.active ? "Active" : "Off"}
                </button>
                <button
                  type="button"
                  onClick={() => void removeCoupon(c.id)}
                  className="border border-[#f3f0e8]/20 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.08em] hover:border-red-300 hover:text-red-300"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
