"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useAdmin } from "@/components/admin/AdminProvider";
import { useDashboard } from "@/components/dashboard/DashboardProvider";
import {
  GhostLink,
  PageHeader,
  StatCard,
  StatusPill,
} from "@/components/dashboard/ui";
import { buildAnalytics } from "@/lib/admin/analytics";
import { formatNaira } from "@/lib/dashboard/pricing";

const LINKS = [
  {
    href: "/dashboard/admin/orders",
    title: "Orders",
    body: "View, update, cancel, or refund production jobs.",
  },
  {
    href: "/dashboard/admin/products",
    title: "Products",
    body: "Materials, garments, colors, and sizes.",
  },
  {
    href: "/dashboard/admin/vendors",
    title: "Vendors",
    body: "Capacity, quality, pricing, and delivery.",
  },
  {
    href: "/dashboard/admin/profit",
    title: "Profit",
    body: "Margins, promotions, discounts, coupons.",
  },
  {
    href: "/dashboard/admin/analytics",
    title: "Analytics",
    body: "Revenue, conversion, and vendor performance.",
  },
] as const;

export default function AdminOverviewPage() {
  const { ready: dashReady, orders, designs } = useDashboard();
  const { ready: adminReady, vendors, catalog } = useAdmin();

  if (!dashReady || !adminReady) {
    return <p className="text-sm text-[#c8c4b8]">Loading admin…</p>;
  }

  const analytics = buildAnalytics(orders, vendors, designs.length);
  const openOrders = orders.filter(
    (o) => !["delivered", "cancelled", "refunded"].includes(o.status),
  );
  const recent = orders.slice(0, 4);

  return (
    <div>
      <PageHeader
        title="Admin"
        description="Operate catalog, vendors, and fulfillment. Data is local/stubbed until backend auth ships."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Revenue"
          value={analytics.revenueLabel}
          hint="Local orders + demo marketplace"
        />
        <StatCard
          label="Open orders"
          value={openOrders.length}
          hint={`${orders.length} total on this device`}
        />
        <StatCard
          label="Active vendors"
          value={vendors.filter((v) => v.active).length}
          hint={`${vendors.length} in roster`}
        />
        <StatCard
          label="Catalog SKUs"
          value={
            catalog.garments.filter((g) => g.active).length +
            catalog.materials.filter((m) => m.active).length
          }
          hint="Active garments + materials"
        />
      </div>

      <section className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="group border border-[#f3f0e8]/12 bg-[#0c0e0c] p-5 transition hover:border-[#d6ff3c]/40"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-[family-name:var(--font-display)] text-xl font-bold tracking-[-0.03em]">
                {link.title}
              </h2>
              <ArrowUpRight
                size={16}
                className="mt-1 text-[#c8c4b8] transition group-hover:text-[#d6ff3c]"
              />
            </div>
            <p className="mt-2 text-sm text-[#c8c4b8]">{link.body}</p>
          </Link>
        ))}
      </section>

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-bold tracking-[-0.03em]">
            Recent orders
          </h2>
          <GhostLink href="/dashboard/admin/orders">Manage all</GhostLink>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-[#c8c4b8]">
            No local orders yet — seed appears after first dashboard visit.
          </p>
        ) : (
          <div className="divide-y divide-[#f3f0e8]/10 border border-[#f3f0e8]/12">
            {recent.map((order) => (
              <Link
                key={order.id}
                href={`/dashboard/admin/orders`}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 transition hover:bg-[#f3f0e8]/4"
              >
                <div>
                  <p className="font-medium">{order.line.designTitle}</p>
                  <p className="mt-1 text-xs text-[#c8c4b8]">
                    {order.id} · {formatNaira(order.total)}
                  </p>
                </div>
                <StatusPill status={order.status} />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
