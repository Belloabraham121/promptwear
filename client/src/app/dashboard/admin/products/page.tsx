"use client";

import { useAdmin } from "@/components/admin/AdminProvider";
import { PageHeader } from "@/components/dashboard/ui";
import { formatNaira } from "@/lib/dashboard/pricing";
import { cn } from "@/lib/utils";

function Toggle({
  active,
  onToggle,
}: {
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.08em]",
        active
          ? "bg-[#d6ff3c]/15 text-[#d6ff3c]"
          : "bg-[#f3f0e8]/8 text-[#c8c4b8]",
      )}
    >
      {active ? "Active" : "Off"}
    </button>
  );
}

export default function AdminProductsPage() {
  const { ready, catalog, error, updateCatalogItem } = useAdmin();

  if (!ready) {
    return <p className="text-sm text-[#c8c4b8]">Loading products…</p>;
  }

  if (error) {
    return (
      <p className="text-sm text-red-300">
        Failed to load catalog: {error.message}
      </p>
    );
  }

  const materialName = (id: string) =>
    catalog.materials.find((m) => m.id === id)?.name ?? id;

  return (
    <div>
      <PageHeader
        title="Products"
        description="Materials, garments, colors, and sizes — synced from the admin catalog API."
      />

      <section className="mb-10">
        <h2 className="mb-4 font-[family-name:var(--font-display)] text-xl font-bold tracking-[-0.03em]">
          Materials
        </h2>
        <div className="overflow-x-auto border border-[#f3f0e8]/12">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-[#f3f0e8]/12 bg-[#0c0e0c] text-[0.65rem] uppercase tracking-[0.12em] text-[#c8c4b8]">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">GSM</th>
                <th className="px-4 py-3 font-medium">Composition</th>
                <th className="px-4 py-3 font-medium">Cost</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f3f0e8]/10">
              {catalog.materials.map((m) => (
                <tr key={m.id} className="hover:bg-[#f3f0e8]/4">
                  <td className="px-4 py-3 font-medium">{m.name}</td>
                  <td className="px-4 py-3">{m.gsm}</td>
                  <td className="px-4 py-3 text-[#c8c4b8]">{m.composition}</td>
                  <td className="px-4 py-3">{formatNaira(m.costPerUnit)}</td>
                  <td className="px-4 py-3">
                    <Toggle
                      active={m.active}
                      onToggle={() =>
                        void updateCatalogItem("materials", m.id, {
                          active: !m.active,
                        })
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 font-[family-name:var(--font-display)] text-xl font-bold tracking-[-0.03em]">
          Garments
        </h2>
        <div className="overflow-x-auto border border-[#f3f0e8]/12">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-[#f3f0e8]/12 bg-[#0c0e0c] text-[0.65rem] uppercase tracking-[0.12em] text-[#c8c4b8]">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Silhouette</th>
                <th className="px-4 py-3 font-medium">Material</th>
                <th className="px-4 py-3 font-medium">Base price</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f3f0e8]/10">
              {catalog.garments.map((g) => (
                <tr key={g.id} className="hover:bg-[#f3f0e8]/4">
                  <td className="px-4 py-3 font-medium">{g.name}</td>
                  <td className="px-4 py-3 capitalize text-[#c8c4b8]">
                    {g.silhouette}
                  </td>
                  <td className="px-4 py-3">{materialName(g.materialId)}</td>
                  <td className="px-4 py-3">{formatNaira(g.basePrice)}</td>
                  <td className="px-4 py-3">
                    <Toggle
                      active={g.active}
                      onToggle={() =>
                        void updateCatalogItem("garments", g.id, {
                          active: !g.active,
                        })
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-10 lg:grid-cols-2">
        <section>
          <h2 className="mb-4 font-[family-name:var(--font-display)] text-xl font-bold tracking-[-0.03em]">
            Colors
          </h2>
          <ul className="divide-y divide-[#f3f0e8]/10 border border-[#f3f0e8]/12">
            {catalog.colors.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="size-8 border border-[#f3f0e8]/20"
                    style={{ backgroundColor: c.hex }}
                  />
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-[#c8c4b8]">{c.hex}</p>
                  </div>
                </div>
                <Toggle
                  active={c.active}
                  onToggle={() =>
                    void updateCatalogItem("colors", c.id, {
                      active: !c.active,
                    })
                  }
                />
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="mb-4 font-[family-name:var(--font-display)] text-xl font-bold tracking-[-0.03em]">
            Sizes
          </h2>
          <ul className="divide-y divide-[#f3f0e8]/10 border border-[#f3f0e8]/12">
            {[...catalog.sizes]
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <p className="text-sm font-medium">{s.label}</p>
                  <Toggle
                    active={s.active}
                    onToggle={() =>
                      void updateCatalogItem("sizes", s.id, {
                        active: !s.active,
                      })
                    }
                  />
                </li>
              ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
