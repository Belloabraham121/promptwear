"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AdminPageSkeleton } from "@/components/admin/AdminSkeleton";
import { PageHeader, StatCard } from "@/components/dashboard/ui";
import {
  getAnalyticsSnapshot,
  getRevenueSeries,
} from "@/lib/api/analytics";
import { queryKeys } from "@/lib/api/query-keys";
import { formatNaira } from "@/lib/dashboard/pricing";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";

type RangeKey = "7d" | "30d" | "90d";

const RANGES: { key: RangeKey; label: string; days: number }[] = [
  { key: "7d", label: "7 days", days: 7 },
  { key: "30d", label: "30 days", days: 30 },
  { key: "90d", label: "90 days", days: 90 },
];

const CHART_LIME = "#5a8a7f";
const CHART_BONE = "#0b1f1c";
const CHART_MUTED = "#52706a";
const CHART_GRID = "rgba(11,31,28,0.12)";
const PIE_COLORS = ["#5a8a7f", "#7ec8e3", "#e8a87c", "#52706a"];

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function rangeBounds(days: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setUTCDate(to.getUTCDate() - (days - 1));
  return { from: toDateKey(from), to: toDateKey(to) };
}

function shortDate(iso: string): string {
  const [, month, day] = iso.split("-");
  return `${month}/${day}`;
}

function ChartCard({
  title,
  hint,
  children,
  className,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "border border-[#0b1f1c]/12 bg-white rounded-2xl shadow-[0_1px_2px_rgba(11,31,28,0.05)] p-4 md:p-5",
        className,
      )}
    >
      <div className="mb-4">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-bold tracking-[-0.03em]">
          {title}
        </h2>
        {hint ? <p className="mt-1 text-xs text-[#52706a]">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

function chartTooltipProps() {
  return {
    contentStyle: {
      background: "#ffffff",
      border: "1px solid rgba(11,31,28,0.14)",
      borderRadius: 0,
      color: CHART_BONE,
      boxShadow: "none",
    } satisfies React.CSSProperties,
    labelStyle: { color: CHART_BONE } satisfies React.CSSProperties,
    itemStyle: { color: CHART_BONE } satisfies React.CSSProperties,
    cursor: { fill: "rgba(11,31,28,0.06)" },
  };
}

function moneyTick(value: number): string {
  return value >= 1000 ? `${Math.round(value / 1000)}k` : String(value);
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-64 items-center justify-center text-sm text-[#52706a]">
      {label}
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const { session } = useAuth();
  const isAdmin = session?.role === "admin";
  const [range, setRange] = useState<RangeKey>("30d");
  const bounds = useMemo(
    () => rangeBounds(RANGES.find((r) => r.key === range)?.days ?? 30),
    [range],
  );

  const analyticsQuery = useQuery({
    queryKey: queryKeys.admin.analytics,
    queryFn: getAnalyticsSnapshot,
    enabled: isAdmin,
  });

  const revenueQuery = useQuery({
    queryKey: queryKeys.admin.revenue(bounds.from, bounds.to),
    queryFn: () => getRevenueSeries(bounds.from, bounds.to),
    enabled: isAdmin,
  });

  if (analyticsQuery.isPending) {
    return <AdminPageSkeleton cards={6} rows={6} />;
  }

  if (analyticsQuery.isError || !analyticsQuery.data) {
    return (
      <p className="text-sm text-[#52706a]">
        Could not load analytics. Try refreshing the page.
      </p>
    );
  }

  const a = analyticsQuery.data;
  const series = revenueQuery.data ?? [];
  const chartSeries = series.map((point) => ({
    ...point,
    label: shortDate(point.date),
  }));
  const hasSeries = chartSeries.some(
    (point) => point.revenue > 0 || point.orderCount > 0,
  );

  const rangeRevenue = chartSeries.reduce((sum, p) => sum + p.revenue, 0);
  const rangeOrders = chartSeries.reduce((sum, p) => sum + p.orderCount, 0);

  const audiencePie = [
    {
      name: "Customers",
      value: Math.max(0, a.customerCount - a.repeatCustomers.count),
    },
    { name: "Repeat buyers", value: a.repeatCustomers.count },
    {
      name: "Admins / other",
      value: Math.max(0, a.userCount - a.customerCount),
    },
  ].filter((slice) => slice.value > 0);

  const bestSellingChart = a.bestSelling.map((row) => ({
    name:
      row.title.length > 18 ? `${row.title.slice(0, 16)}…` : row.title,
    fullName: row.title,
    units: row.units,
    revenue: row.revenue,
  }));

  const vendorChart = a.vendorPerformance.map((v) => ({
    name: v.name.length > 14 ? `${v.name.slice(0, 12)}…` : v.name,
    fullName: v.name,
    quality: Number(v.qualityRating.toFixed(1)),
    onTime: Math.round(v.onTimeRate * 100),
    capacity: v.capacityPerWeek,
    active: v.active,
  }));

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Revenue, orders, users, and vendor performance."
        action={
          <div className="flex gap-1 border border-[#0b1f1c]/15 p-1">
            {RANGES.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setRange(option.key)}
                className={cn(
                  "px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.08em] transition",
                  range === option.key
                    ? "bg-[#d6ff3c] text-[#070807]"
                    : "text-[#52706a] hover:text-[#0b1f1c]",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard
          label="Revenue"
          value={a.revenueLabel}
          hint="All-time paid / open orders"
        />
        <StatCard
          label="Orders"
          value={a.orderCount}
          hint="Non-cancelled orders"
        />
        <StatCard
          label="Users"
          value={a.userCount}
          hint={`${a.customerCount} customers`}
        />
        <StatCard
          label="Vendors"
          value={a.activeVendorCount}
          hint={`${a.vendorCount} total in roster`}
        />
        <StatCard
          label="Conversion"
          value={a.conversionLabel}
          hint="Orders per design created"
        />
        <StatCard
          label="Repeat buyers"
          value={a.repeatCustomers.count}
          hint={a.repeatCustomers.hint}
        />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <StatCard
          label={`Revenue · ${range}`}
          value={formatNaira(rangeRevenue)}
          hint={`${bounds.from} → ${bounds.to}`}
        />
        <StatCard
          label={`Orders · ${range}`}
          value={rangeOrders}
          hint={revenueQuery.isPending ? "Loading series…" : "In selected window"}
        />
      </div>

      <div className="mt-8 grid gap-4 xl:grid-cols-2">
        <ChartCard
          title="Revenue over time"
          hint="Daily revenue in the selected range"
        >
          {revenueQuery.isPending ? (
            <EmptyChart label="Loading revenue chart…" />
          ) : !hasSeries ? (
            <EmptyChart label="No revenue in this range yet." />
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartSeries}>
                  <defs>
                    <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_LIME} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={CHART_LIME} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={CHART_GRID} vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: CHART_MUTED, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    minTickGap={24}
                  />
                  <YAxis
                    tick={{ fill: CHART_MUTED, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={56}
                    tickFormatter={moneyTick}
                  />
                  <Tooltip
                    {...chartTooltipProps()}
                    formatter={(value) => [
                      formatNaira(Number(value ?? 0)),
                      "Revenue",
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke={CHART_LIME}
                    fill="url(#revenueFill)"
                    strokeWidth={2}
                    name="Revenue"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        <ChartCard
          title="Orders over time"
          hint="Daily order count in the selected range"
        >
          {revenueQuery.isPending ? (
            <EmptyChart label="Loading orders chart…" />
          ) : !hasSeries ? (
            <EmptyChart label="No orders in this range yet." />
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartSeries}>
                  <CartesianGrid stroke={CHART_GRID} vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: CHART_MUTED, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    minTickGap={24}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: CHART_MUTED, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={32}
                  />
                  <Tooltip
                    {...chartTooltipProps()}
                    formatter={(value) => [Number(value ?? 0), "Orders"]}
                  />
                  <Bar
                    dataKey="orderCount"
                    fill={CHART_LIME}
                    radius={[2, 2, 0, 0]}
                    name="Orders"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <ChartCard
          title="Best-selling designs"
          hint="Top designs by units sold"
        >
          {bestSellingChart.length === 0 ? (
            <EmptyChart label="No sales data yet." />
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={bestSellingChart}
                  layout="vertical"
                  margin={{ left: 8, right: 16 }}
                >
                  <CartesianGrid stroke={CHART_GRID} horizontal={false} />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{ fill: CHART_MUTED, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={96}
                    tick={{ fill: CHART_MUTED, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    {...chartTooltipProps()}
                    formatter={(value) => [Number(value ?? 0), "Units"]}
                  />
                  <Bar
                    dataKey="units"
                    fill={CHART_LIME}
                    radius={[0, 2, 2, 0]}
                    name="Units"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        <ChartCard
          title="Users mix"
          hint="Customers, repeat buyers, and other accounts"
        >
          {audiencePie.length === 0 ? (
            <EmptyChart label="No users yet." />
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={audiencePie}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={58}
                    outerRadius={92}
                    paddingAngle={2}
                  >
                    {audiencePie.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip {...chartTooltipProps()} />
                  <Legend
                    wrapperStyle={{ color: CHART_MUTED, fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>
      </div>

      <ChartCard
        className="mt-4"
        title="Vendor quality vs on-time"
        hint="Active and paused vendors compared side by side"
      >
        {vendorChart.length === 0 ? (
          <EmptyChart label="No vendors in roster." />
        ) : (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={vendorChart} margin={{ left: 8, right: 8 }}>
                <CartesianGrid stroke={CHART_GRID} vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: CHART_MUTED, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={56}
                />
                <YAxis
                  tick={{ fill: CHART_MUTED, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                />
                <Tooltip {...chartTooltipProps()} />
                <Legend wrapperStyle={{ color: CHART_MUTED, fontSize: 12 }} />
                <Bar dataKey="quality" name="Quality (1–5)" fill={CHART_LIME} />
                <Bar dataKey="onTime" name="On-time %" fill="#7ec8e3" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartCard>

      <section className="mt-10">
        <h2 className="mb-4 font-[family-name:var(--font-display)] text-xl font-bold tracking-[-0.03em]">
          Best-selling designs
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-[#0b1f1c]/12 bg-white shadow-[0_1px_2px_rgba(11,31,28,0.05)]">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="border-b border-[#0b1f1c]/12 bg-white rounded-2xl shadow-[0_1px_2px_rgba(11,31,28,0.05)] text-[0.65rem] uppercase tracking-[0.12em] text-[#52706a]">
              <tr>
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Design</th>
                <th className="px-4 py-3 font-medium">Units</th>
                <th className="px-4 py-3 font-medium">Revenue</th>
                <th className="px-4 py-3 font-medium">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#0b1f1c]/10">
              {a.bestSelling.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-[#52706a]"
                  >
                    No bestsellers yet.
                  </td>
                </tr>
              ) : (
                a.bestSelling.map((row, index) => {
                  const share =
                    a.revenue > 0
                      ? Math.round((row.revenue / a.revenue) * 100)
                      : 0;
                  return (
                    <tr key={`${row.title}-${index}`} className="hover:bg-[#0b1f1c]/4">
                      <td className="px-4 py-3 text-[#52706a]">{index + 1}</td>
                      <td className="px-4 py-3 font-medium">{row.title}</td>
                      <td className="px-4 py-3">{row.units}</td>
                      <td className="px-4 py-3">{formatNaira(row.revenue)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 overflow-hidden bg-[#0b1f1c]/10">
                            <div
                              className="h-full bg-[#d6ff3c]"
                              style={{ width: `${share}%` }}
                            />
                          </div>
                          <span className="text-xs text-[#52706a]">{share}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-4 font-[family-name:var(--font-display)] text-xl font-bold tracking-[-0.03em]">
          Vendors
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-[#0b1f1c]/12 bg-white shadow-[0_1px_2px_rgba(11,31,28,0.05)]">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-[#0b1f1c]/12 bg-white rounded-2xl shadow-[0_1px_2px_rgba(11,31,28,0.05)] text-[0.65rem] uppercase tracking-[0.12em] text-[#52706a]">
              <tr>
                <th className="px-4 py-3 font-medium">Vendor</th>
                <th className="px-4 py-3 font-medium">Quality</th>
                <th className="px-4 py-3 font-medium">On-time</th>
                <th className="px-4 py-3 font-medium">Capacity</th>
                <th className="px-4 py-3 font-medium">Price idx</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#0b1f1c]/10">
              {a.vendorPerformance.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center text-[#52706a]"
                  >
                    No vendors yet.
                  </td>
                </tr>
              ) : (
                a.vendorPerformance.map((v) => (
                  <tr key={v.id} className="hover:bg-[#0b1f1c]/4">
                    <td className="px-4 py-3 font-medium">{v.name}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden bg-[#0b1f1c]/10">
                          <div
                            className="h-full bg-[#d6ff3c]"
                            style={{
                              width: `${Math.min(100, (v.qualityRating / 5) * 100)}%`,
                            }}
                          />
                        </div>
                        <span>{v.qualityRating.toFixed(1)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden bg-[#0b1f1c]/10">
                          <div
                            className="h-full bg-[#7ec8e3]"
                            style={{
                              width: `${Math.round(v.onTimeRate * 100)}%`,
                            }}
                          />
                        </div>
                        <span>{Math.round(v.onTimeRate * 100)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">{v.capacityPerWeek}/wk</td>
                    <td className="px-4 py-3">{v.priceIndex.toFixed(2)}</td>
                    <td className="px-4 py-3">
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
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
