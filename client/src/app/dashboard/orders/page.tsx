"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useDashboard } from "@/components/dashboard/DashboardProvider";
import {
  EmptyState,
  PageHeader,
  PrimaryLink,
  StatusPill,
} from "@/components/dashboard/ui";
import { listOrders } from "@/lib/api/orders";
import { ApiError } from "@/lib/api/errors";
import { formatNaira, totalQuantity } from "@/lib/dashboard/pricing";
import type { Order } from "@/lib/dashboard/types";

export default function OrdersPage() {
  const { ready } = useDashboard();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;

    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await listOrders();
        setOrders(response.items);
      } catch (err) {
        setOrders([]);
        setError(
          err instanceof ApiError ? err.message : "Could not load orders",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [ready]);

  if (!ready || loading) {
    return <p className="text-sm text-[#52706a]">Loading orders…</p>;
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

      {error ? (
        <p className="mb-4 text-sm text-red-700">{error}</p>
      ) : null}

      {orders.length === 0 ? (
        <EmptyState
          title="No orders yet"
          body="Pick a design, set sizes and cloth quality, get an instant quote, then place the order."
          action={
            <PrimaryLink href="/dashboard/orders/new">Start an order</PrimaryLink>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#0b1f1c]/12 bg-white shadow-[0_1px_2px_rgba(11,31,28,0.05)]">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-[#0b1f1c]/12 bg-[#0b1f1c]/[0.03] text-[0.65rem] uppercase tracking-[0.12em] text-[#52706a]">
              <tr>
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Design</th>
                <th className="px-4 py-3 font-medium">Qty</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#0b1f1c]/10">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-[#0b1f1c]/4">
                  <td className="px-4 py-4">
                    <Link
                      href={`/dashboard/orders/${order.id}`}
                      className="font-medium text-[#3f4d0e] hover:underline"
                    >
                      {order.id}
                    </Link>
                    <p className="mt-1 text-xs text-[#52706a]">
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
