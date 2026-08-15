"use client";

import { useAdmin } from "@/components/admin/AdminProvider";
import { useDashboard } from "@/components/dashboard/DashboardProvider";
import { PageHeader, StatCard } from "@/components/dashboard/ui";
import { buildAnalytics } from "@/lib/admin/analytics";
import { formatNaira } from "@/lib/dashboard/pricing";
import { cn } from "@/lib/utils";

export default function AdminAnalyticsPage() {
  const { ready: dashReady, orders, designs } = useDashboard();
  const { ready: adminReady, vendors } = useAdmin();

  if (!dashReady || !adminReady) {
    return <p className="text-sm text-[#c8c4b8]">Loading analytics…</p>;
  }

  const a = buildAnalytics(orders, vendors, designs.length);

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Revenue, orders, conversion, bestsellers, repeat buyers, and vendor performance. Mix of local + stubbed demo figures."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Revenue" value={a.revenueLabel} hint="Incl. stub marketplace" />
        <StatCard label="Orders" value={a.orderCount} hint={`${orders.length} on this device`} />
        <StatCard
          label="Conversion"
          value={a.conversionLabel}
          hint="Orders / designs (local) blended"
        />
        <StatCard
          label="Repeat customers"
          value={a.repeatCustomers.count}
          hint={a.repeatCustomers.hint}
        />
      </div>

      <section className="mt-10">
        <h2 className="mb-4 font-[family-name:var(--font-display)] text-xl font-bold tracking-[-0.03em]">
          Best-selling designs
        </h2>
        <div className="overflow-x-auto border border-[#f3f0e8]/12">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="border-b border-[#f3f0e8]/12 bg-[#0c0e0c] text-[0.65rem] uppercase tracking-[0.12em] text-[#c8c4b8]">
              <tr>
                <th className="px-4 py-3 font-medium">Design</th>
                <th className="px-4 py-3 font-medium">Units</th>
                <th className="px-4 py-3 font-medium">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f3f0e8]/10">
              {a.bestSelling.map((row) => (
                <tr key={row.title} className="hover:bg-[#f3f0e8]/4">
                  <td className="px-4 py-3 font-medium">{row.title}</td>
                  <td className="px-4 py-3">{row.units}</td>
                  <td className="px-4 py-3">{formatNaira(row.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-4 font-[family-name:var(--font-display)] text-xl font-bold tracking-[-0.03em]">
          Vendor performance
        </h2>
        <div className="overflow-x-auto border border-[#f3f0e8]/12">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-[#f3f0e8]/12 bg-[#0c0e0c] text-[0.65rem] uppercase tracking-[0.12em] text-[#c8c4b8]">
              <tr>
                <th className="px-4 py-3 font-medium">Vendor</th>
                <th className="px-4 py-3 font-medium">Quality</th>
                <th className="px-4 py-3 font-medium">On-time</th>
                <th className="px-4 py-3 font-medium">Capacity</th>
                <th className="px-4 py-3 font-medium">Price idx</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f3f0e8]/10">
              {a.vendorPerformance.map((v) => (
                <tr key={v.id} className="hover:bg-[#f3f0e8]/4">
                  <td className="px-4 py-3 font-medium">{v.name}</td>
                  <td className="px-4 py-3">{v.qualityRating.toFixed(1)}</td>
                  <td className="px-4 py-3">
                    {Math.round(v.onTimeRate * 100)}%
                  </td>
                  <td className="px-4 py-3">{v.capacityPerWeek}/wk</td>
                  <td className="px-4 py-3">{v.priceIndex.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.1em]",
                        v.active
                          ? "bg-[#d6ff3c]/15 text-[#d6ff3c]"
                          : "bg-[#f3f0e8]/8 text-[#c8c4b8]",
                      )}
                    >
                      {v.active ? "Active" : "Paused"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
