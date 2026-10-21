"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { InkButton, Kicker } from "@/components/brand/ui";
import { useDashboard } from "@/components/dashboard/DashboardProvider";
import {
  GhostLink,
  PageHeader,
  PrimaryLink,
  SectionHeading,
  StatCard,
  StatusPill,
} from "@/components/dashboard/ui";
import { ChatGarmentCard } from "@/components/dashboard/GarmentArt";
import { OverviewSkeleton } from "@/components/dashboard/Skeletons";
import { formatNaira, formatNairaCompact, totalQuantity } from "@/lib/dashboard/pricing";

export default function DashboardOverviewPage() {
  const { ready, designs, orders, user } = useDashboard();

  if (!ready) {
    return <OverviewSkeleton />;
  }

  const openOrders = orders.filter(
    (o) => !["delivered", "cancelled", "refunded"].includes(o.status),
  );
  const recentDesigns = designs.slice(0, 3);
  const recentOrders = orders.slice(0, 3);

  return (
    <div>
      <PageHeader
        kicker="Your studio"
        title={`Hey, ${user.name.split(" ")[0] || "creator"}.`}
        description="Design a tee, save it here, then quote sizes and quality when you’re ready to order."
        action={<PrimaryLink href="/dashboard/studio">Start designing</PrimaryLink>}
      />

      <div className="grid grid-cols-2 gap-px border border-ink/12 bg-ink/12 xl:grid-cols-4 [&>article]:border-0">
        <StatCard label="Designs" value={designs.length} hint="Saved in studio" />
        <StatCard
          label="Open orders"
          value={openOrders.length}
          hint="In progress or quoted"
        />
        <StatCard label="All orders" value={orders.length} hint="Lifetime total" />
        <StatCard
          label="Last quote"
          value={orders[0] ? formatNairaCompact(orders[0].total) : "—"}
          exact={orders[0] ? formatNaira(orders[0].total) : undefined}
          hint={orders[0] ? orders[0].line.designTitle : "Place your first order"}
        />
      </div>

      <section className="mt-14">
        <SectionHeading
          index="01"
          title="Recent designs"
          action={<GhostLink href="/dashboard/designs">View all</GhostLink>}
        />
        {recentDesigns.length === 0 ? (
          <StarterBanner />
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 lg:grid-cols-3">
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

      <section className="mt-14">
        <SectionHeading
          index="02"
          title="Recent orders"
          action={<GhostLink href="/dashboard/orders">View all</GhostLink>}
        />
        {recentOrders.length === 0 ? (
          <p className="m-0 text-[0.95rem] text-mute">
            No orders yet. Save a design, then quote sizes and quality to place one.
          </p>
        ) : (
          <div className="divide-y divide-ink/10 border border-ink/12 bg-paper">
            {recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/dashboard/orders/${order.id}`}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 transition hover:bg-ink/4"
              >
                <div>
                  <p className="m-0 font-heading text-[1.05rem] font-bold tracking-[-0.03em]">
                    {order.line.designTitle}
                  </p>
                  <p className="mt-1 text-xs text-mute">
                    {totalQuantity(order.line.sizes)} pcs · {formatNaira(order.total)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusPill status={order.status} />
                  <ArrowUpRight size={16} className="text-mute" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/** First-run prompt: ink panel with a garment cutout, shown before any design exists. */
function StarterBanner() {
  return (
    <div className="relative grid overflow-hidden bg-ink text-bone md:grid-cols-[1.3fr_1fr]">
      <div className="relative z-10 p-7 md:p-10">
        <Kicker className="text-lime">Your first drop</Kicker>
        <p className="mt-5 mb-0 max-w-[14ch] font-heading text-[clamp(2rem,4vw,3.2rem)] leading-[0.92] font-extrabold tracking-[-0.055em]">
          Prompt it. Sketch it. Wear it.
        </p>
        <p className="mt-4 mb-7 max-w-[38ch] text-[0.92rem] leading-[1.55] text-mist">
          Describe an idea or draw it in the studio. Your saved designs land on this shelf, ready to
          order from one piece.
        </p>
        <InkButton href="/dashboard/studio" tone="lime">
          Open the studio
        </InkButton>
      </div>
      <div className="relative hidden min-h-[16rem] md:block">
        <Image
          src="/landing/v2/hero-cutout-01.png"
          alt=""
          fill
          sizes="30vw"
          className="object-contain object-bottom p-6 drop-shadow-[0_24px_30px_rgba(0,0,0,0.45)]"
        />
      </div>
    </div>
  );
}
