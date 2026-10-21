"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useDashboard } from "@/components/dashboard/DashboardProvider";
import {
  GhostLink,
  PageHeader,
  PrimaryLink,
  StatusPill,
} from "@/components/dashboard/ui";
import { OrderDetailSkeleton } from "@/components/dashboard/Skeletons";
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
  const [advancing, setAdvancing] = useState(false);

  useEffect(() => {
    if (!ready || !params.id) return;

    void (async () => {
      setLoading(true);
      try {
        setOrder(await getOrder(params.id));
      } catch (err) {
        setOrder(null);
        toast.error(
          err instanceof ApiError ? err.message : "Could not load order",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [ready, params.id]);

  if (!ready || loading) {
    return <OrderDetailSkeleton />;
  }

  if (!order) {
    return (
      <div>
        <PageHeader title="Order not found" />
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
        kicker="Order"
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
                    toast.success(`Advanced to ${STATUS_LABELS[next]}`);
                  } catch (err) {
                    toast.error(
                      err instanceof ApiError
                        ? err.message
                        : "Could not update order status",
                    );
                  } finally {
                    setAdvancing(false);
                  }
                })();
              }}
              className="bg-lime px-4 py-2.5 text-xs font-bold uppercase tracking-[0.06em] text-ink hover:bg-lime/80 disabled:opacity-50"
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
          <span className="text-xs text-mute">
            Est. {order.pricing.deliveryDays} days
          </span>
        ) : null}
      </div>

      <section className="mb-8 border border-ink/12 bg-paper p-5">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-bold">
          Tracking
        </h2>
        {order.status === "cancelled" || order.status === "refunded" ? (
          <p className="mt-3 text-sm text-mute">
            This order is {STATUS_LABELS[order.status].toLowerCase()}. Tracking
            stopped.
          </p>
        ) : order.status === "quoted" || order.status === "draft" ? (
          <p className="mt-3 text-sm text-mute">
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
                          ? "bg-lime"
                          : "bg-ink/20",
                      )}
                    />
                    {index < TRACKING_STATUSES.length - 1 ? (
                      <span
                        className={cn(
                          "min-h-8 w-px flex-1",
                          done ? "bg-lime/50" : "bg-ink/15",
                        )}
                      />
                    ) : null}
                  </div>
                  <div className={cn("pb-6", current && "pb-8")}>
                    <p
                      className={cn(
                        "text-sm font-medium",
                        current
                          ? "text-olive"
                          : done
                            ? "text-ink"
                            : "text-mute",
                      )}
                    >
                      {STATUS_LABELS[status]}
                    </p>
                    {event ? (
                      <p className="mt-1 text-xs text-mute">
                        {new Date(event.at).toLocaleString("en-NG")}
                      </p>
                    ) : current ? (
                      <p className="mt-1 text-xs text-mute">In progress</p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4 border border-ink/12 bg-paper p-5">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-bold">
            Configuration
          </h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-mute">Cloth quality</dt>
              <dd>{QUALITY_LABELS[order.line.quality]}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-mute">Print</dt>
              <dd>{PRINT_LABELS[order.line.print]}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-mute">Pieces</dt>
              <dd>{qty}</dd>
            </div>
          </dl>

          <div>
            <p className="text-[0.65rem] uppercase tracking-[0.14em] text-mute">
              Size breakdown
            </p>
            <ul className="mt-3 grid grid-cols-5 gap-2">
              {SIZES.map((size) => (
                <li
                  key={size}
                  className="border border-ink/12 bg-paper px-2 py-3 text-center"
                >
                  <p className="text-[0.65rem] text-mute">{size}</p>
                  <p className="mt-1 font-semibold">{order.line.sizes[size]}</p>
                </li>
              ))}
            </ul>
          </div>

          {order.note ? (
            <p className="text-sm text-mute">Note: {order.note}</p>
          ) : null}
        </section>

        <section className="space-y-4 border border-ink/12 bg-paper p-5">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-bold">
            Price
          </h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-mute">Subtotal</dt>
              <dd>{formatNaira(order.subtotal)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-mute">Delivery (NG)</dt>
              <dd>{formatNaira(order.delivery)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-ink/12 pt-3 text-base font-semibold">
              <dt>Total</dt>
              <dd className="text-olive">{formatNaira(order.total)}</dd>
            </div>
          </dl>

          {order.checkout ? (
            <div className="border-t border-ink/10 pt-4 text-sm">
              <p className="text-[0.65rem] uppercase tracking-[0.14em] text-mute">
                Checkout
              </p>
              <p className="mt-2">{order.checkout.contact.fullName}</p>
              <p className="text-mute">{order.checkout.contact.email}</p>
              <p className="text-mute">{order.checkout.contact.phone}</p>
              <p className="mt-3 text-mute">
                {order.checkout.address.line1}
                {order.checkout.address.line2
                  ? `, ${order.checkout.address.line2}`
                  : ""}
              </p>
              <p className="text-mute">
                {order.checkout.address.city}, {order.checkout.address.state}
              </p>
              <p className="mt-3">
                Payment: {PAYMENT_LABELS[order.checkout.paymentMethod]}{" "}
                <span className="text-xs text-mute">(offline)</span>
              </p>
            </div>
          ) : null}

          {isAdmin && order.pricing ? (
            <div className="border-t border-ink/10 pt-4 text-xs text-mute">
              <p className="text-[0.65rem] uppercase tracking-[0.14em]">
                Vendor assignment
              </p>
              <p className="mt-2 text-sm text-ink">
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
