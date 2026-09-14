"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { useAdmin } from "@/components/admin/AdminProvider";
import { AdminPageSkeleton } from "@/components/admin/AdminSkeleton";
import {
  EmptyState,
  PageHeader,
  StatusPill,
} from "@/components/dashboard/ui";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ApiError } from "@/lib/api/errors";
import { formatNaira, totalQuantity } from "@/lib/dashboard/pricing";
import {
  ADMIN_FULFILLMENT_STATUSES,
  NEXT_TRACKING_STATUS,
  STATUS_LABELS,
  type OrderStatus,
} from "@/lib/dashboard/types";
import { cn } from "@/lib/utils";

export default function AdminOrdersPage() {
  const {
    ready,
    orders,
    error,
    updateOrderStatus,
    cancelOrder,
    refundOrder,
  } = useAdmin();
  const [refundOrderId, setRefundOrderId] = useState<string | null>(null);
  const [refunding, setRefunding] = useState(false);

  const pendingRefund = orders.find((order) => order.id === refundOrderId);

  async function confirmRefund() {
    if (!refundOrderId) return;
    setRefunding(true);
    try {
      await refundOrder(refundOrderId);
      toast.success("Order marked refunded");
      setRefundOrderId(null);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Could not refund order",
      );
    } finally {
      setRefunding(false);
    }
  }

  if (!ready) {
    return <AdminPageSkeleton cards={0} rows={6} />;
  }

  if (error) {
    return (
      <p className="text-sm text-red-700">
        Failed to load orders: {error.message}
      </p>
    );
  }

  return (
    <div>
      <PageHeader
        title="Orders"
        description="Advance fulfillment statuses, cancel jobs, or mark refunds via the admin API."
      />

      {orders.length === 0 ? (
        <EmptyState
          title="No orders"
          body="Orders placed from the creator dashboard will show up here."
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#0b1f1c]/12 bg-white shadow-[0_1px_2px_rgba(11,31,28,0.05)]">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-[#0b1f1c]/12 bg-[#0b1f1c]/[0.03] text-[0.65rem] uppercase tracking-[0.12em] text-[#52706a]">
              <tr>
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Design</th>
                <th className="px-4 py-3 font-medium">Vendor</th>
                <th className="px-4 py-3 font-medium">Qty</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#0b1f1c]/10">
              {orders.map((order) => {
                const next = NEXT_TRACKING_STATUS[order.status];
                return (
                  <tr key={order.id} className="align-top hover:bg-[#0b1f1c]/4">
                    <td className="px-4 py-4">
                      <p className="font-medium text-[#3f4d0e]">{order.id}</p>
                      <p className="mt-1 text-xs text-[#52706a]">
                        {new Date(order.createdAt).toLocaleDateString("en-NG")}
                      </p>
                    </td>
                    <td className="px-4 py-4">{order.line.designTitle}</td>
                    <td className="px-4 py-4 text-xs text-[#52706a]">
                      {order.pricing?.vendorName ?? "—"}
                    </td>
                    <td className="px-4 py-4">
                      {totalQuantity(order.line.sizes)}
                    </td>
                    <td className="px-4 py-4">{formatNaira(order.total)}</td>
                    <td className="px-4 py-4">
                      <StatusPill status={order.status} />
                      <label className="mt-3 block">
                        <span className="sr-only">Update status</span>
                        <select
                          value={order.status}
                          onChange={(e) =>
                            void updateOrderStatus(
                              order.id,
                              e.target.value as OrderStatus,
                            )
                          }
                          className="mt-2 w-full max-w-[12rem] border border-[#0b1f1c]/15 bg-white rounded-xl px-2 py-1.5 text-xs outline-none focus:border-[#d6ff3c]"
                        >
                          {ADMIN_FULFILLMENT_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {STATUS_LABELS[status]}
                            </option>
                          ))}
                          {order.status === "draft" ? (
                            <option value="draft">{STATUS_LABELS.draft}</option>
                          ) : null}
                        </select>
                      </label>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        {next ? (
                          <button
                            type="button"
                            onClick={() =>
                              void updateOrderStatus(order.id, next)
                            }
                            className="border border-[#d6ff3c]/40 px-2.5 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-[#3f4d0e] hover:bg-[#d6ff3c]/10"
                          >
                            Advance
                          </button>
                        ) : null}
                        <Link
                          href={`/dashboard/admin/orders/${order.id}`}
                          className="border border-[#0b1f1c]/20 px-2.5 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.08em] hover:border-[#d6ff3c] hover:text-[#3f4d0e]"
                        >
                          View
                        </Link>
                        <button
                          type="button"
                          disabled={
                            order.status === "cancelled" ||
                            order.status === "refunded"
                          }
                          onClick={() => void cancelOrder(order.id)}
                          className={cn(
                            "border border-[#0b1f1c]/20 px-2.5 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.08em]",
                            order.status === "cancelled" ||
                              order.status === "refunded"
                              ? "opacity-40"
                              : "hover:border-red-700 hover:text-red-700",
                          )}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={
                            order.status === "refunded" ||
                            order.status === "draft" ||
                            order.status === "quoted"
                          }
                          onClick={() => setRefundOrderId(order.id)}
                          className={cn(
                            "border border-[#0b1f1c]/20 px-2.5 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.08em]",
                            order.status === "refunded" ||
                              order.status === "draft" ||
                              order.status === "quoted"
                              ? "opacity-40"
                              : "hover:border-[#d6ff3c] hover:text-[#3f4d0e]",
                          )}
                        >
                          Refund
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={refundOrderId != null}
        title="Refund this order?"
        description={
          pendingRefund ? (
            <>
              This will mark{" "}
              <span className="text-[#0b1f1c]">{pendingRefund.id}</span> (
              {pendingRefund.line.designTitle},{" "}
              {formatNaira(pendingRefund.total)}) as refunded. This cannot be
              undone from the admin UI.
            </>
          ) : (
            "This will mark the order as refunded. This cannot be undone from the admin UI."
          )
        }
        confirmLabel="Refund order"
        cancelLabel="Keep order"
        tone="danger"
        confirming={refunding}
        onConfirm={() => void confirmRefund()}
        onCancel={() => {
          if (!refunding) setRefundOrderId(null);
        }}
      />
    </div>
  );
}
