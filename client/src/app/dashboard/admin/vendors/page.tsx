"use client";

import { FormEvent, useState } from "react";
import { useAdmin } from "@/components/admin/AdminProvider";
import { AdminPageSkeleton } from "@/components/admin/AdminSkeleton";
import { EmptyState, PageHeader } from "@/components/dashboard/ui";
import { formatNaira } from "@/lib/dashboard/pricing";
import { cn } from "@/lib/utils";

export default function AdminVendorsPage() {
  const {
    ready,
    vendors,
    error,
    addVendor,
    updateVendor,
    removeVendor,
  } = useAdmin();
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");

  if (!ready) {
    return <AdminPageSkeleton cards={0} rows={6} />;
  }

  if (error) {
    return (
      <p className="text-sm text-red-700">
        Failed to load vendors: {error.message}
      </p>
    );
  }

  async function handleAdd(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    await addVendor({ name, location });
    setName("");
    setLocation("");
  }

  return (
    <div>
      <PageHeader
        title="Vendors"
        description="Production partners scored for the smart pricing engine — cost, capacity, quality, SLA, and coverage."
      />

      <form
        onSubmit={handleAdd}
        className="mb-8 grid gap-3 rounded-2xl border border-[#0b1f1c]/12 bg-white p-4 shadow-[0_1px_2px_rgba(11,31,28,0.05)] sm:grid-cols-[1fr_1fr_auto]"
      >
        <label className="block">
          <span className="text-[0.65rem] uppercase tracking-[0.14em] text-[#52706a]">
            Vendor name
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-2 w-full border border-[#0b1f1c]/15 bg-white rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#d6ff3c]"
            placeholder="Print house"
          />
        </label>
        <label className="block">
          <span className="text-[0.65rem] uppercase tracking-[0.14em] text-[#52706a]">
            Location
          </span>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="mt-2 w-full border border-[#0b1f1c]/15 bg-white rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#d6ff3c]"
            placeholder="City"
          />
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            className="w-full bg-[#d6ff3c] px-4 py-2.5 text-xs font-bold uppercase tracking-[0.06em] text-[#070807] hover:bg-[#e2ff6a] sm:w-auto"
          >
            Add vendor
          </button>
        </div>
      </form>

      {vendors.length === 0 ? (
        <EmptyState
          title="No vendors"
          body="Add a print partner to track capacity and delivery performance."
        />
      ) : (
        <div className="space-y-4">
          {vendors.map((v) => (
            <article
              key={v.id}
              className="rounded-2xl border border-[#0b1f1c]/12 bg-white p-5 shadow-[0_1px_2px_rgba(11,31,28,0.05)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="font-[family-name:var(--font-display)] text-lg font-bold">
                    {v.name}
                  </h3>
                  <p className="mt-1 text-sm text-[#52706a]">{v.location}</p>
                  {v.notes ? (
                    <p className="mt-2 max-w-xl text-xs text-[#52706a]">
                      {v.notes}
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span
                      className={cn(
                        "inline-flex px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.1em]",
                        v.active
                          ? "bg-[#d6ff3c]/15 text-[#3f4d0e]"
                          : "bg-[#0b1f1c]/8 text-[#52706a]",
                      )}
                    >
                      {v.active ? "Active" : "Paused"}
                    </span>
                    <span className="inline-flex bg-[#0b1f1c]/8 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-[#52706a]">
                      SLA {v.deliverySlaDays}d · prod {v.estimatedProductionDays}d
                    </span>
                    <span className="inline-flex bg-[#0b1f1c]/8 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-[#52706a]">
                      {v.printMethods.join(" · ")}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      void updateVendor(v.id, { active: !v.active })
                    }
                    className="border border-[#0b1f1c]/20 px-2.5 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.08em] hover:border-[#d6ff3c] hover:text-[#3f4d0e]"
                  >
                    {v.active ? "Pause" : "Activate"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void removeVendor(v.id)}
                    className="border border-[#0b1f1c]/20 px-2.5 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.08em] hover:border-red-700 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label className="block">
                  <span className="text-[0.6rem] uppercase tracking-[0.12em] text-[#52706a]">
                    Quality score
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    step={0.1}
                    value={v.qualityRating}
                    onChange={(e) =>
                      void updateVendor(v.id, {
                        qualityRating: Number(e.target.value),
                      })
                    }
                    className="mt-1.5 w-full border border-[#0b1f1c]/15 bg-white rounded-xl px-2 py-1.5 text-sm outline-none focus:border-[#d6ff3c]"
                  />
                </label>
                <label className="block">
                  <span className="text-[0.6rem] uppercase tracking-[0.12em] text-[#52706a]">
                    Customer rating
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    step={0.1}
                    value={v.customerRating}
                    onChange={(e) =>
                      void updateVendor(v.id, {
                        customerRating: Number(e.target.value),
                      })
                    }
                    className="mt-1.5 w-full border border-[#0b1f1c]/15 bg-white rounded-xl px-2 py-1.5 text-sm outline-none focus:border-[#d6ff3c]"
                  />
                </label>
                <label className="block">
                  <span className="text-[0.6rem] uppercase tracking-[0.12em] text-[#52706a]">
                    Capacity / wk
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={50}
                    value={v.capacityPerWeek}
                    onChange={(e) =>
                      void updateVendor(v.id, {
                        capacityPerWeek: Number(e.target.value),
                      })
                    }
                    className="mt-1.5 w-full border border-[#0b1f1c]/15 bg-white rounded-xl px-2 py-1.5 text-sm outline-none focus:border-[#d6ff3c]"
                  />
                </label>
                <label className="block">
                  <span className="text-[0.6rem] uppercase tracking-[0.12em] text-[#52706a]">
                    Price index
                  </span>
                  <input
                    type="number"
                    min={0.5}
                    max={2}
                    step={0.01}
                    value={v.priceIndex}
                    onChange={(e) =>
                      void updateVendor(v.id, {
                        priceIndex: Number(e.target.value),
                      })
                    }
                    className="mt-1.5 w-full border border-[#0b1f1c]/15 bg-white rounded-xl px-2 py-1.5 text-sm outline-none focus:border-[#d6ff3c]"
                  />
                </label>
                <label className="block">
                  <span className="text-[0.6rem] uppercase tracking-[0.12em] text-[#52706a]">
                    On-time rate
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={1}
                    step={0.01}
                    value={v.onTimeRate}
                    onChange={(e) =>
                      void updateVendor(v.id, {
                        onTimeRate: Number(e.target.value),
                      })
                    }
                    className="mt-1.5 w-full border border-[#0b1f1c]/15 bg-white rounded-xl px-2 py-1.5 text-sm outline-none focus:border-[#d6ff3c]"
                  />
                </label>
                <label className="block">
                  <span className="text-[0.6rem] uppercase tracking-[0.12em] text-[#52706a]">
                    Prod days
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={21}
                    value={v.estimatedProductionDays}
                    onChange={(e) =>
                      void updateVendor(v.id, {
                        estimatedProductionDays: Number(e.target.value),
                      })
                    }
                    className="mt-1.5 w-full border border-[#0b1f1c]/15 bg-white rounded-xl px-2 py-1.5 text-sm outline-none focus:border-[#d6ff3c]"
                  />
                </label>
                <label className="block">
                  <span className="text-[0.6rem] uppercase tracking-[0.12em] text-[#52706a]">
                    Delivery SLA days
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={21}
                    value={v.deliverySlaDays}
                    onChange={(e) =>
                      void updateVendor(v.id, {
                        deliverySlaDays: Number(e.target.value),
                      })
                    }
                    className="mt-1.5 w-full border border-[#0b1f1c]/15 bg-white rounded-xl px-2 py-1.5 text-sm outline-none focus:border-[#d6ff3c]"
                  />
                </label>
                <label className="block">
                  <span className="text-[0.6rem] uppercase tracking-[0.12em] text-[#52706a]">
                    Ship base
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={v.shippingCostBase}
                    onChange={(e) =>
                      void updateVendor(v.id, {
                        shippingCostBase: Number(e.target.value),
                      })
                    }
                    className="mt-1.5 w-full border border-[#0b1f1c]/15 bg-white rounded-xl px-2 py-1.5 text-sm outline-none focus:border-[#d6ff3c]"
                  />
                </label>
              </div>

              <div className="mt-4 grid gap-3 text-xs text-[#52706a] sm:grid-cols-3">
                <p>
                  Garment std / prem / heavy:{" "}
                  <span className="text-[#0b1f1c]">
                    {formatNaira(v.garmentCostByQuality.standard)} /{" "}
                    {formatNaira(v.garmentCostByQuality.premium)} /{" "}
                    {formatNaira(v.garmentCostByQuality.heavy)}
                  </span>
                </p>
                <p>
                  Print DTF / screen:{" "}
                  <span className="text-[#0b1f1c]">
                    {formatNaira(v.printingCostByMethod.dtf)} /{" "}
                    {formatNaira(v.printingCostByMethod.screen)}
                  </span>
                </p>
                <p>
                  Materials:{" "}
                  <span className="text-[#0b1f1c]">
                    {v.materialAvailable.join(", ")}
                  </span>
                  <br />
                  Regions:{" "}
                  <span className="text-[#0b1f1c]">
                    {v.deliveryRegions.join(", ")}
                  </span>
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
