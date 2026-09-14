"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight } from "lucide-react";
import { useAdmin } from "@/components/admin/AdminProvider";
import { AdminPageSkeleton } from "@/components/admin/AdminSkeleton";
import {
  GhostLink,
  PageHeader,
  StatCard,
  StatusPill,
} from "@/components/dashboard/ui";
import { getAnalyticsSnapshot } from "@/lib/api/analytics";
import { queryKeys } from "@/lib/api/query-keys";
import { formatNaira } from "@/lib/dashboard/pricing";
import { useAuth } from "@/providers/AuthProvider";

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
  const { ready: adminReady, vendors, catalog, orders, error } = useAdmin();
  const { session } = useAuth();
  const isAdmin = session?.role === "admin";
  const analyticsQuery = useQuery({
    queryKey: queryKeys.admin.analytics,
    queryFn: getAnalyticsSnapshot,
    enabled: adminReady && isAdmin,
  });

  if (!adminReady) {
    return <AdminPageSkeleton />;
  }

  if (error) {
    return (
      <p className="text-sm text-red-700">
        Failed to load admin data: {error.message}
      </p>
    );
  }

  const analytics = analyticsQuery.data;
  const openOrders = orders.filter(
    (o) => !["delivered", "cancelled", "refunded"].includes(o.status),
  );
  const recent = orders.slice(0, 4);

  return (
    <div>
      <PageHeader
        title="Admin"
        description={
          session
            ? `Signed in as ${session.name} · ${session.email}`
            : "Operate catalog, vendors, and fulfillment across the platform."
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Revenue"
          value={
            analyticsQuery.isPending ? "…" : (analytics?.revenueLabel ?? "—")
          }
          hint="Paid orders, all time"
        />
        <StatCard
          label="Open orders"
          value={openOrders.length}
          hint={`${orders.length} total in queue`}
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
            className="group border border-[#0b1f1c]/12 bg-white rounded-2xl shadow-[0_1px_2px_rgba(11,31,28,0.05)] p-5 transition hover:border-[#d6ff3c]/40"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-[family-name:var(--font-display)] text-xl font-bold tracking-[-0.03em]">
                {link.title}
              </h2>
              <ArrowUpRight
                size={16}
                className="mt-1 text-[#52706a] transition group-hover:text-[#3f4d0e]"
              />
            </div>
            <p className="mt-2 text-sm text-[#52706a]">{link.body}</p>
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
          <p className="text-sm text-[#52706a]">No orders yet.</p>
        ) : (
          <div className="divide-y divide-[#0b1f1c]/10 rounded-2xl border border-[#0b1f1c]/12 bg-white shadow-[0_1px_2px_rgba(11,31,28,0.05)]">
            {recent.map((order) => (
              <Link
                key={order.id}
                href={`/dashboard/admin/orders/${order.id}`}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 transition hover:bg-[#0b1f1c]/4"
              >
                <div>
                  <p className="font-medium">{order.line.designTitle}</p>
                  <p className="mt-1 text-xs text-[#52706a]">
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
