"use client";

import { useQuery } from "@tanstack/react-query";
import { PageHeader, StatCard } from "@/components/dashboard/ui";
import { getAnalyticsSnapshot } from "@/lib/api/analytics";
import { queryKeys } from "@/lib/api/query-keys";
import { formatNaira } from "@/lib/dashboard/pricing";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";

export default function AdminAnalyticsPage() {
  const { session } = useAuth();
  const isAdmin = session?.role === "admin";
  const analyticsQuery = useQuery({
    queryKey: queryKeys.admin.analytics,
    queryFn: getAnalyticsSnapshot,
    enabled: isAdmin,
  });

  if (analyticsQuery.isLoading) {
    return <p className="text-sm text-[#c8c4b8]">Loading analytics…</p>;
  }

  if (analyticsQuery.isError || !analyticsQuery.data) {
    return (
      <p className="text-sm text-[#c8c4b8]">
        Could not load analytics. Try refreshing the page.
      </p>
    );
  }

  const a = analyticsQuery.data;

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Revenue, orders, conversion, bestsellers, repeat buyers, and vendor performance."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Revenue" value={a.revenueLabel} hint="Paid orders, all time" />
        <StatCard label="Orders" value={a.orderCount} hint="Non-cancelled orders" />
        <StatCard
          label="Conversion"
          value={a.conversionLabel}
          hint="Orders per design created"
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
