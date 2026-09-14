"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useDashboard } from "@/components/dashboard/DashboardProvider";
import {
  GhostLink,
  PageHeader,
  PrimaryLink,
  StatCard,
  StatusPill,
} from "@/components/dashboard/ui";
import { ChatGarmentCard } from "@/components/dashboard/GarmentArt";
import { formatNaira, totalQuantity } from "@/lib/dashboard/pricing";

export default function DashboardOverviewPage() {
  const { ready, designs, orders, user } = useDashboard();

  if (!ready) {
    return (
      <p className="text-sm text-[#52706a]">Loading your studio…</p>
    );
  }

  const openOrders = orders.filter(
    (o) => !["delivered", "cancelled", "refunded"].includes(o.status),
  );
  const recentDesigns = designs.slice(0, 3);
  const recentOrders = orders.slice(0, 3);

  return (
    <div>
      <PageHeader
        title={`Hey, ${user.name.split(" ")[0] || "creator"}`}
        description="Design a tee, save it here, then quote sizes and quality when you’re ready to order."
        action={<PrimaryLink href="/dashboard/studio">Start designing</PrimaryLink>}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Designs" value={designs.length} hint="Saved in studio" />
        <StatCard
          label="Open orders"
          value={openOrders.length}
          hint="In progress or quoted"
        />
        <StatCard label="All orders" value={orders.length} hint="Lifetime total" />
        <StatCard
          label="Last quote"
          value={orders[0] ? formatNaira(orders[0].total) : "—"}
          hint={orders[0] ? orders[0].line.designTitle : "Place your first order"}
        />
      </div>

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-bold tracking-[-0.03em]">
            Recent designs
          </h2>
          <GhostLink href="/dashboard/studio">View all</GhostLink>
        </div>
        {recentDesigns.length === 0 ? (
          <p className="text-sm text-[#52706a]">
            No designs yet.{" "}
            <Link href="/dashboard/studio" className="text-[#3f4d0e] underline">
              Open the studio
            </Link>
            .
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentDesigns.map((design) => (
              <Link
                key={design.id}
                href={`/dashboard/studio/${design.id}`}
                className="group block transition hover:opacity-95"
              >
                <ChatGarmentCard
                  title={design.title}
                  text={design.prompt}
                  method={design.method}
                  messageCount={design.chat.length}
                />
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-bold tracking-[-0.03em]">
            Recent orders
          </h2>
          <GhostLink href="/dashboard/orders">View all</GhostLink>
        </div>
        {recentOrders.length === 0 ? (
          <p className="text-sm text-[#52706a]">No orders yet.</p>
        ) : (
          <div className="divide-y divide-[#0b1f1c]/10 rounded-2xl border border-[#0b1f1c]/12 bg-white shadow-[0_1px_2px_rgba(11,31,28,0.05)]">
            {recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/dashboard/orders/${order.id}`}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 transition hover:bg-[#0b1f1c]/4"
              >
                <div>
                  <p className="font-medium">{order.line.designTitle}</p>
                  <p className="mt-1 text-xs text-[#52706a]">
                    {totalQuantity(order.line.sizes)} pcs · {formatNaira(order.total)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusPill status={order.status} />
                  <ArrowUpRight size={16} className="text-[#52706a]" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
