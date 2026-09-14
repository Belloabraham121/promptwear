"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAdmin } from "@/components/admin/AdminProvider";
import { AdminPageSkeleton } from "@/components/admin/AdminSkeleton";
import {
  GhostLink,
  PageHeader,
  StatusPill,
} from "@/components/dashboard/ui";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  cancelAdminOrder,
  getAdminOrder,
  refundAdminOrder,
  updateAdminOrderStatus,
} from "@/lib/api/admin";
import { ApiError } from "@/lib/api/errors";
import { formatNaira, totalQuantity } from "@/lib/dashboard/pricing";
import {
  ADMIN_FULFILLMENT_STATUSES,
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

function errorMessage(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback;
}

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const { ready, refresh } = useAdmin();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"advance" | "cancel" | "refund" | null>(
    null,
  );
  const [refundOpen, setRefundOpen] = useState(false);

  useEffect(() => {
    if (!ready || !params.id) return;

    void (async () => {
      setLoading(true);
      try {
        setOrder(await getAdminOrder(params.id));
      } catch (err) {
        setOrder(null);
        toast.error(errorMessage(err, "Could not load order"));
      } finally {
        setLoading(false);
      }
    })();
  }, [ready, params.id]);

  async function runAction(
    kind: "advance" | "cancel" | "refund",
    action: () => Promise<Order>,
    successMessage: string,
  ) {
    setBusy(kind);
    try {
      const updated = await action();
      setOrder(updated);
      await refresh();
      toast.success(successMessage);
    } catch (err) {
      toast.error(errorMessage(err, "Could not update order"));
    } finally {
      setBusy(null);
    }
  }

  if (!ready || loading) {
    return <AdminPageSkeleton cards={2} rows={4} />;
  }

  if (!order) {
    return (
      <div>
        <PageHeader title="Order not found" />
        <GhostLink href="/dashboard/admin/orders">Back to orders</GhostLink>
      </div>
    );
  }

  const next = NEXT_TRACKING_STATUS[order.status];
  const qty = totalQuantity(order.line.sizes);
  const currentIdx = trackingIndex(order.status);
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
          <div className="flex flex-wrap gap-2">
            {next && !terminal ? (
              <button
                type="button"
                disabled={busy !== null}
                onClick={() =>
                  void runAction(
                    "advance",
                    () => updateAdminOrderStatus(order.id, next),
                    `Advanced to ${STATUS_LABELS[next]}`,
                  )
                }
                className="bg-[#d6ff3c] px-4 py-2.5 text-xs font-bold uppercase tracking-[0.06em] text-[#070807] hover:bg-[#e2ff6a] disabled:opacity-50"
              >
                {busy === "advance"
                  ? "Updating…"
                  : `Advance to ${STATUS_LABELS[next]}`}
              </button>
            ) : null}
            <GhostLink href="/dashboard/admin/orders">All orders</GhostLink>
          </div>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <StatusPill status={order.status} />
        <label className="inline-flex items-center gap-2 text-xs text-[#52706a]">
          Status
          <select
            value={order.status}
            disabled={busy !== null}
            onChange={(e) => {
              const status = e.target.value as OrderStatus;
              void runAction(
                "advance",
                () => updateAdminOrderStatus(order.id, status),
                `Status set to ${STATUS_LABELS[status]}`,
              );
            }}
            className="border border-[#0b1f1c]/15 bg-white rounded-xl px-2 py-1.5 text-xs text-[#0b1f1c] outline-none focus:border-[#d6ff3c]"
          >
            {ADMIN_FULFILLMENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
            {order.status === "draft" ? (
              <option value="draft">{STATUS_LABELS.draft}</option>
            ) : null}
            {order.status === "quoted" ? (
              <option value="quoted">{STATUS_LABELS.quoted}</option>
            ) : null}
          </select>
        </label>
        {order.pricing ? (
          <span className="text-xs text-[#52706a]">
            Est. {order.pricing.deliveryDays} days
          </span>
        ) : null}
      </div>

      <div className="mb-8 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={
            busy !== null ||
            order.status === "cancelled" ||
            order.status === "refunded"
          }
          onClick={() =>
            void runAction(
              "cancel",
              () => cancelAdminOrder(order.id),
              "Order cancelled",
            )
          }
          className={cn(
            "border border-[#0b1f1c]/20 px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.08em]",
            order.status === "cancelled" || order.status === "refunded"
              ? "opacity-40"
              : "hover:border-red-700 hover:text-red-700",
          )}
        >
          {busy === "cancel" ? "Cancelling…" : "Cancel order"}
        </button>
        <button
          type="button"
          disabled={
            busy !== null ||
            order.status === "refunded" ||
            order.status === "draft" ||
            order.status === "quoted"
          }
          onClick={() => setRefundOpen(true)}
          className={cn(
            "border border-[#0b1f1c]/20 px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.08em]",
            order.status === "refunded" ||
              order.status === "draft" ||
              order.status === "quoted"
              ? "opacity-40"
              : "hover:border-[#d6ff3c] hover:text-[#3f4d0e]",
          )}
        >
          {busy === "refund" ? "Refunding…" : "Mark refunded"}
        </button>
      </div>

      <ConfirmDialog
        open={refundOpen}
        title="Refund this order?"
        description={
          <>
            This will mark{" "}
            <span className="text-[#0b1f1c]">{order.id}</span> (
            {order.line.designTitle}, {formatNaira(order.total)}) as refunded.
            This cannot be undone from the admin UI.
          </>
        }
        confirmLabel="Refund order"
        cancelLabel="Keep order"
        tone="danger"
        confirming={busy === "refund"}
        onConfirm={() => {
          void (async () => {
            setBusy("refund");
            try {
              const updated = await refundAdminOrder(order.id);
              setOrder(updated);
              await refresh();
              toast.success("Order marked refunded");
              setRefundOpen(false);
            } catch (err) {
              toast.error(errorMessage(err, "Could not update order"));
            } finally {
              setBusy(null);
            }
          })();
        }}
        onCancel={() => {
          if (busy !== "refund") setRefundOpen(false);
        }}
      />

      <section className="mb-8 border border-[#0b1f1c]/12 rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(11,31,28,0.05)]">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-bold">
          Tracking
        </h2>
        {order.status === "cancelled" || order.status === "refunded" ? (
          <p className="mt-3 text-sm text-[#52706a]">
            This order is {STATUS_LABELS[order.status].toLowerCase()}. Tracking
            stopped.
          </p>
        ) : order.status === "quoted" || order.status === "draft" ? (
          <p className="mt-3 text-sm text-[#52706a]">
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
                        done || current ? "bg-[#d6ff3c]" : "bg-[#0b1f1c]/20",
                      )}
                    />
                    {index < TRACKING_STATUSES.length - 1 ? (
                      <span
                        className={cn(
                          "min-h-8 w-px flex-1",
                          done ? "bg-[#d6ff3c]/50" : "bg-[#0b1f1c]/15",
                        )}
                      />
                    ) : null}
                  </div>
                  <div className={cn("pb-6", current && "pb-8")}>
                    <p
                      className={cn(
                        "text-sm font-medium",
                        current
                          ? "text-[#3f4d0e]"
                          : done
                            ? "text-[#0b1f1c]"
                            : "text-[#52706a]",
                      )}
                    >
                      {STATUS_LABELS[status]}
                    </p>
                    {event ? (
                      <p className="mt-1 text-xs text-[#52706a]">
                        {new Date(event.at).toLocaleString("en-NG")}
                      </p>
                    ) : current ? (
                      <p className="mt-1 text-xs text-[#52706a]">In progress</p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4 border border-[#0b1f1c]/12 rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(11,31,28,0.05)]">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-bold">
            Configuration
          </h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-[#52706a]">Design</dt>
              <dd>
                <Link
                  href={`/dashboard/designs/${order.line.designId}`}
                  className="text-[#3f4d0e] underline-offset-2 hover:underline"
                >
                  {order.line.designTitle}
                </Link>
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[#52706a]">Color</dt>
              <dd>{order.line.color}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[#52706a]">Cloth quality</dt>
              <dd>{QUALITY_LABELS[order.line.quality]}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[#52706a]">Print</dt>
              <dd>{PRINT_LABELS[order.line.print]}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[#52706a]">Pieces</dt>
              <dd>{qty}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[#52706a]">Placed</dt>
              <dd>{new Date(order.createdAt).toLocaleString("en-NG")}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[#52706a]">Updated</dt>
              <dd>{new Date(order.updatedAt).toLocaleString("en-NG")}</dd>
            </div>
          </dl>

          <div>
            <p className="text-[0.65rem] uppercase tracking-[0.14em] text-[#52706a]">
              Size breakdown
            </p>
            <ul className="mt-3 grid grid-cols-5 gap-2">
              {SIZES.map((size) => (
                <li
                  key={size}
                  className="border border-[#0b1f1c]/12 px-2 py-3 text-center"
                >
                  <p className="text-[0.65rem] text-[#52706a]">{size}</p>
                  <p className="mt-1 font-semibold">{order.line.sizes[size]}</p>
                </li>
              ))}
            </ul>
          </div>

          {order.note ? (
            <p className="text-sm text-[#52706a]">Note: {order.note}</p>
          ) : null}
        </section>

        <section className="space-y-4 border border-[#0b1f1c]/12 rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(11,31,28,0.05)]">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-bold">
            Price & customer
          </h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-[#52706a]">Subtotal</dt>
              <dd>{formatNaira(order.subtotal)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[#52706a]">Delivery (NG)</dt>
              <dd>{formatNaira(order.delivery)}</dd>
            </div>
            {order.pricing?.discountAmount ? (
              <div className="flex justify-between gap-4">
                <dt className="text-[#52706a]">
                  Discount
                  {order.pricing.couponCode
                    ? ` (${order.pricing.couponCode})`
                    : ""}
                </dt>
                <dd>−{formatNaira(order.pricing.discountAmount)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-4 border-t border-[#0b1f1c]/12 pt-3 text-base font-semibold">
              <dt>Total</dt>
              <dd className="text-[#3f4d0e]">{formatNaira(order.total)}</dd>
            </div>
          </dl>

          {order.checkout ? (
            <div className="border-t border-[#0b1f1c]/10 pt-4 text-sm">
              <p className="text-[0.65rem] uppercase tracking-[0.14em] text-[#52706a]">
                Customer & delivery
              </p>
              <p className="mt-2">{order.checkout.contact.fullName}</p>
              <p className="text-[#52706a]">{order.checkout.contact.email}</p>
              <p className="text-[#52706a]">{order.checkout.contact.phone}</p>
              <p className="mt-3 text-[#52706a]">
                {order.checkout.address.line1}
                {order.checkout.address.line2
                  ? `, ${order.checkout.address.line2}`
                  : ""}
              </p>
              <p className="text-[#52706a]">
                {order.checkout.address.city}, {order.checkout.address.state}
                {order.checkout.address.postalCode
                  ? ` ${order.checkout.address.postalCode}`
                  : ""}
              </p>
              <p className="text-[#52706a]">{order.checkout.address.country}</p>
              <p className="mt-3">
                Payment: {PAYMENT_LABELS[order.checkout.paymentMethod]}{" "}
                <span className="text-xs text-[#52706a]">(offline)</span>
              </p>
            </div>
          ) : (
            <p className="border-t border-[#0b1f1c]/10 pt-4 text-sm text-[#52706a]">
              No checkout details on this order yet.
            </p>
          )}

          {order.pricing ? (
            <div className="border-t border-[#0b1f1c]/10 pt-4 text-xs text-[#52706a]">
              <p className="text-[0.65rem] uppercase tracking-[0.14em]">
                Vendor assignment
              </p>
              <p className="mt-2 text-sm text-[#0b1f1c]">
                {order.pricing.vendorName}
              </p>
              <p className="mt-1">
                Strategy: {order.pricing.strategy}
                {order.pricing.overridden ? " (overridden)" : ""}
              </p>
              <p className="mt-1">
                Fulfillment {formatNaira(order.pricing.fulfillmentCost)} · margin{" "}
                {order.pricing.marginPct}% (
                {formatNaira(order.pricing.marginAmount)})
              </p>
              <p className="mt-1">
                Production {order.pricing.productionDays}d · delivery{" "}
                {order.pricing.deliveryDays}d
              </p>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
