"use client";

import Link from "next/link";
import { useDashboard } from "@/components/dashboard/DashboardProvider";
import {
  EmptyState,
  PageHeader,
  PrimaryLink,
  StatusPill,
} from "@/components/dashboard/ui";
import { formatNaira, totalQuantity } from "@/lib/dashboard/pricing";

export default function OrdersPage() {
  const { ready, orders } = useDashboard();

  if (!ready) {
    return <p className="text-sm text-[#c8c4b8]">Loading orders…</p>;
  }

  return (
    <div>
      <PageHeader
        title="Orders"
        description="Checkout, production tracking, and delivery — every order you place from a saved design."
        action={
          <PrimaryLink href="/dashboard/orders/new">New order</PrimaryLink>
        }
      />

      {orders.length === 0 ? (
        <EmptyState
          title="No orders yet"
          body="Pick a design, set sizes and cloth quality, get an instant quote, then place the order."
          action={
            <PrimaryLink href="/dashboard/orders/new">Start an order</PrimaryLink>
          }
        />
      ) : (
        <div className="overflow-x-auto border border-[#f3f0e8]/12">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-[#f3f0e8]/12 bg-[#0c0e0c] text-[0.65rem] uppercase tracking-[0.12em] text-[#c8c4b8]">
              <tr>
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Design</th>
                <th className="px-4 py-3 font-medium">Qty</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f3f0e8]/10">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-[#f3f0e8]/4">
                  <td className="px-4 py-4">
                    <Link
                      href={`/dashboard/orders/${order.id}`}
                      className="font-medium text-[#d6ff3c] hover:underline"
                    >
                      {order.id}
                    </Link>
                    <p className="mt-1 text-xs text-[#c8c4b8]">
                      {new Date(order.createdAt).toLocaleDateString("en-NG")}
                    </p>
                  </td>
                  <td className="px-4 py-4">{order.line.designTitle}</td>
                  <td className="px-4 py-4">
                    {totalQuantity(order.line.sizes)}
                  </td>
                  <td className="px-4 py-4">{formatNaira(order.total)}</td>
                  <td className="px-4 py-4">
                    <StatusPill status={order.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
