"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useDashboard } from "@/components/dashboard/DashboardProvider";
import {
  GhostLink,
  PageHeader,
  PrimaryLink,
  StatusPill,
} from "@/components/dashboard/ui";
import { getOrder } from "@/lib/api/orders";
import { updateAdminOrderStatus } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/errors";
import { formatNaira, totalQuantity } from "@/lib/dashboard/pricing";
import {
  NEXT_TRACKING_STATUS,
  PAYMENT_LABELS,
  PRINT_LABELS,
  QUALITY_LABELS,
  SIZES,
  STATUS_LABELS,
  TRACKING_STATUSES,
  type Order,
  type OrderStatus,
} from "@/lib/dashboard/types";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";

function trackingIndex(status: OrderStatus): number {
  if (status === "cancelled" || status === "refunded") return -1;
  if (status === "quoted" || status === "draft") return -1;
  const normalized =
    status === "paid"
      ? "order_received"
      : status === "in_production"
        ? "printing"
        : status;
  return TRACKING_STATUSES.indexOf(normalized);
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const { ready } = useDashboard();
  const { session } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [advancing, setAdvancing] = useState(false);

  useEffect(() => {
    if (!ready || !params.id) return;

    void (async () => {
      setLoading(true);
      setError(null);
      try {
        setOrder(await getOrder(params.id));
      } catch (err) {
        setOrder(null);
        setError(
          err instanceof ApiError ? err.message : "Could not load order",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [ready, params.id]);

  if (!ready || loading) {
    return <p className="text-sm text-[#c8c4b8]">Loading order…</p>;
  }

  if (!order) {
    return (
      <div>
        <PageHeader title="Order not found" />
        {error ? <p className="mb-4 text-sm text-red-300">{error}</p> : null}
        <GhostLink href="/dashboard/orders">Back to orders</GhostLink>
      </div>
    );
  }

  const next = NEXT_TRACKING_STATUS[order.status];
  const qty = totalQuantity(order.line.sizes);
  const currentIdx = trackingIndex(order.status);
  const isAdmin = session?.role === "admin";
  const terminal =
    order.status === "cancelled" ||
    order.status === "refunded" ||
    order.status === "delivered";

  return (
    <div>
      <PageHeader
        title={order.id}
        description={order.line.designTitle}
        action={
          isAdmin && next && !terminal ? (
            <button
              type="button"
              disabled={advancing}
              onClick={() => {
                void (async () => {
                  setAdvancing(true);
                  try {
                    await updateAdminOrderStatus(order.id, next);
                    setOrder(await getOrder(order.id));
                  } catch (err) {
                    setError(
                      err instanceof ApiError
                        ? err.message
                        : "Could not update order status",
                    );
                  } finally {
                    setAdvancing(false);
                  }
                })();
              }}
              className="bg-[#d6ff3c] px-4 py-2.5 text-xs font-bold uppercase tracking-[0.06em] text-[#070807] hover:bg-[#e2ff6a] disabled:opacity-50"
            >
              {advancing ? "Updating…" : `Advance to ${STATUS_LABELS[next]}`}
            </button>
          ) : (
            <PrimaryLink href="/dashboard/orders/new">New order</PrimaryLink>
          )
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <StatusPill status={order.status} />
        {order.pricing ? (
          <span className="text-xs text-[#c8c4b8]">
            Est. {order.pricing.deliveryDays} days
          </span>
        ) : null}
      </div>

      <section className="mb-8 border border-[#f3f0e8]/12 p-5">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-bold">
          Tracking
        </h2>
        {order.status === "cancelled" || order.status === "refunded" ? (
          <p className="mt-3 text-sm text-[#c8c4b8]">
            This order is {STATUS_LABELS[order.status].toLowerCase()}. Tracking
            stopped.
          </p>
        ) : order.status === "quoted" || order.status === "draft" ? (
          <p className="mt-3 text-sm text-[#c8c4b8]">
            Awaiting checkout confirmation.
          </p>
        ) : (
          <ol className="mt-5 space-y-0">
            {TRACKING_STATUSES.map((status, index) => {
              const done = currentIdx > index;
              const current = currentIdx === index;
              const event = order.statusHistory?.find((e) => e.status === status);
              return (
                <li key={status} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <span
                      className={cn(
                        "flex h-3 w-3 shrink-0 rounded-full",
                        done || current
                          ? "bg-[#d6ff3c]"
                          : "bg-[#f3f0e8]/20",
                      )}
                    />
                    {index < TRACKING_STATUSES.length - 1 ? (
                      <span
                        className={cn(
                          "min-h-8 w-px flex-1",
                          done ? "bg-[#d6ff3c]/50" : "bg-[#f3f0e8]/15",
                        )}
                      />
                    ) : null}
                  </div>
                  <div className={cn("pb-6", current && "pb-8")}>
                    <p
                      className={cn(
                        "text-sm font-medium",
                        current
                          ? "text-[#d6ff3c]"
                          : done
                            ? "text-[#f3f0e8]"
                            : "text-[#c8c4b8]",
                      )}
                    >
                      {STATUS_LABELS[status]}
                    </p>
                    {event ? (
                      <p className="mt-1 text-xs text-[#c8c4b8]">
                        {new Date(event.at).toLocaleString("en-NG")}
                      </p>
                    ) : current ? (
                      <p className="mt-1 text-xs text-[#c8c4b8]">In progress</p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

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
            Price
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

          {order.checkout ? (
            <div className="border-t border-[#f3f0e8]/10 pt-4 text-sm">
              <p className="text-[0.65rem] uppercase tracking-[0.14em] text-[#c8c4b8]">
                Checkout
              </p>
              <p className="mt-2">{order.checkout.contact.fullName}</p>
              <p className="text-[#c8c4b8]">{order.checkout.contact.email}</p>
              <p className="text-[#c8c4b8]">{order.checkout.contact.phone}</p>
              <p className="mt-3 text-[#c8c4b8]">
                {order.checkout.address.line1}
                {order.checkout.address.line2
                  ? `, ${order.checkout.address.line2}`
                  : ""}
              </p>
              <p className="text-[#c8c4b8]">
                {order.checkout.address.city}, {order.checkout.address.state}
              </p>
              <p className="mt-3">
                Payment: {PAYMENT_LABELS[order.checkout.paymentMethod]}{" "}
                <span className="text-xs text-[#c8c4b8]">(offline)</span>
              </p>
            </div>
          ) : null}

          {isAdmin && order.pricing ? (
            <div className="border-t border-[#f3f0e8]/10 pt-4 text-xs text-[#c8c4b8]">
              <p className="text-[0.65rem] uppercase tracking-[0.14em]">
                Vendor assignment
              </p>
              <p className="mt-2 text-sm text-[#f3f0e8]">
                {order.pricing.vendorName}
              </p>
              <p className="mt-1">
                Fulfillment {formatNaira(order.pricing.fulfillmentCost)} · margin{" "}
                {order.pricing.marginPct}% (
                {formatNaira(order.pricing.marginAmount)})
              </p>
            </div>
          ) : null}

          <GhostLink href={`/dashboard/designs/${order.line.designId}`}>
            View design
          </GhostLink>
        </section>
      </div>
    </div>
  );
}
