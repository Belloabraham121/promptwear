"use client";

import { useParams } from "next/navigation";
import { useDashboard } from "@/components/dashboard/DashboardProvider";
import {
  GhostLink,
  PageHeader,
  PrimaryLink,
  StatusPill,
} from "@/components/dashboard/ui";
import { formatNaira, totalQuantity } from "@/lib/dashboard/pricing";
import {
  PRINT_LABELS,
  QUALITY_LABELS,
  SIZES,
  type OrderStatus,
} from "@/lib/dashboard/types";

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  quoted: "paid",
  paid: "in_production",
  in_production: "shipped",
  shipped: "delivered",
};

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const { ready, orders, updateOrderStatus } = useDashboard();
  const order = orders.find((o) => o.id === params.id);

  if (!ready) {
    return <p className="text-sm text-[#c8c4b8]">Loading order…</p>;
  }

  if (!order) {
    return (
      <div>
        <PageHeader title="Order not found" />
        <GhostLink href="/dashboard/orders">Back to orders</GhostLink>
      </div>
    );
  }

  const next = NEXT_STATUS[order.status];
  const qty = totalQuantity(order.line.sizes);

  return (
    <div>
      <PageHeader
        title={order.id}
        description={order.line.designTitle}
        action={
          next ? (
            <button
              type="button"
              onClick={() => updateOrderStatus(order.id, next)}
              className="bg-[#d6ff3c] px-4 py-2.5 text-xs font-bold uppercase tracking-[0.06em] text-[#070807] hover:bg-[#e2ff6a]"
            >
              Mark as {next.replace(/_/g, " ")}
            </button>
          ) : (
            <PrimaryLink href="/dashboard/orders/new">New order</PrimaryLink>
          )
        }
      />

      <div className="mb-6">
        <StatusPill status={order.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4 border border-[#f3f0e8]/12 p-5">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-bold">
            Configuration
          </h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-[#c8c4b8]">Cloth quality</dt>
              <dd>{QUALITY_LABELS[order.line.quality]}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[#c8c4b8]">Print</dt>
              <dd>{PRINT_LABELS[order.line.print]}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[#c8c4b8]">Pieces</dt>
              <dd>{qty}</dd>
            </div>
          </dl>

          <div>
            <p className="text-[0.65rem] uppercase tracking-[0.14em] text-[#c8c4b8]">
              Size breakdown
            </p>
            <ul className="mt-3 grid grid-cols-5 gap-2">
              {SIZES.map((size) => (
                <li
                  key={size}
                  className="border border-[#f3f0e8]/12 px-2 py-3 text-center"
                >
                  <p className="text-[0.65rem] text-[#c8c4b8]">{size}</p>
                  <p className="mt-1 font-semibold">{order.line.sizes[size]}</p>
                </li>
              ))}
            </ul>
          </div>

          {order.note ? (
            <p className="text-sm text-[#c8c4b8]">Note: {order.note}</p>
          ) : null}
        </section>

        <section className="space-y-4 border border-[#f3f0e8]/12 p-5">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-bold">
            Quote
          </h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-[#c8c4b8]">Subtotal</dt>
              <dd>{formatNaira(order.subtotal)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[#c8c4b8]">Delivery (NG)</dt>
              <dd>{formatNaira(order.delivery)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-[#f3f0e8]/12 pt-3 text-base font-semibold">
              <dt>Total</dt>
              <dd className="text-[#d6ff3c]">{formatNaira(order.total)}</dd>
            </div>
          </dl>
          <p className="text-xs text-[#c8c4b8]">
            Payment (Paystack) wires in next — for now advance the status to
            simulate the fulfilment path.
          </p>
          <GhostLink href={`/dashboard/designs/${order.line.designId}`}>
            View design
          </GhostLink>
        </section>
      </div>
    </div>
  );
}
