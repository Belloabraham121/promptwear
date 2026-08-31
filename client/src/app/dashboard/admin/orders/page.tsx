"use client";

import Link from "next/link";
import { useAdmin } from "@/components/admin/AdminProvider";
import {
  EmptyState,
  PageHeader,
  StatusPill,
} from "@/components/dashboard/ui";
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

  if (!ready) {
    return <p className="text-sm text-[#c8c4b8]">Loading orders…</p>;
  }

  if (error) {
    return (
      <p className="text-sm text-red-300">
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
        <div className="overflow-x-auto border border-[#f3f0e8]/12">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-[#f3f0e8]/12 bg-[#0c0e0c] text-[0.65rem] uppercase tracking-[0.12em] text-[#c8c4b8]">
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
            <tbody className="divide-y divide-[#f3f0e8]/10">
              {orders.map((order) => {
                const next = NEXT_TRACKING_STATUS[order.status];
                return (
                  <tr key={order.id} className="align-top hover:bg-[#f3f0e8]/4">
                    <td className="px-4 py-4">
                      <p className="font-medium text-[#d6ff3c]">{order.id}</p>
                      <p className="mt-1 text-xs text-[#c8c4b8]">
                        {new Date(order.createdAt).toLocaleDateString("en-NG")}
                      </p>
                    </td>
                    <td className="px-4 py-4">{order.line.designTitle}</td>
                    <td className="px-4 py-4 text-xs text-[#c8c4b8]">
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
                          className="mt-2 w-full max-w-[12rem] border border-[#f3f0e8]/15 bg-[#070807] px-2 py-1.5 text-xs outline-none focus:border-[#d6ff3c]"
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
                            className="border border-[#d6ff3c]/40 px-2.5 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-[#d6ff3c] hover:bg-[#d6ff3c]/10"
                          >
                            Advance
                          </button>
                        ) : null}
                        <Link
                          href={`/dashboard/orders/${order.id}`}
                          className="border border-[#f3f0e8]/20 px-2.5 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.08em] hover:border-[#d6ff3c] hover:text-[#d6ff3c]"
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
                            "border border-[#f3f0e8]/20 px-2.5 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.08em]",
                            order.status === "cancelled" ||
                              order.status === "refunded"
                              ? "opacity-40"
                              : "hover:border-red-300 hover:text-red-300",
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
                          onClick={() => void refundOrder(order.id)}
                          className={cn(
                            "border border-[#f3f0e8]/20 px-2.5 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.08em]",
                            order.status === "refunded" ||
                              order.status === "draft" ||
                              order.status === "quoted"
                              ? "opacity-40"
                              : "hover:border-[#d6ff3c] hover:text-[#d6ff3c]",
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
    </div>
  );
}
