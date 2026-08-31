"use client";

import { quoteOrder, quoteSmartOrder, isSmartQuote } from "@/lib/dashboard/pricing";
import type { SmartQuote } from "@/lib/pricing/engine";
import type {
  DashboardUser,
  Design,
  Order,
  OrderCheckout,
  OrderLine,
  OrderPricingSnapshot,
} from "@/lib/dashboard/types";
import {
  normalizeOrderStatus,
} from "@/lib/dashboard/types";
import { listOrders, putOrder, uid } from "@/lib/db/client";

export type DashboardState = {
  user: DashboardUser;
  designs: Design[];
  orders: Order[];
};

export type PlaceOrderOptions = {
  note?: string;
  checkout?: OrderCheckout;
  quote?: SmartQuote;
};

/** Load orders from local IDB cache (legacy fallback until fully API-backed). */
export async function loadOrdersState(): Promise<Order[]> {
  const orders = await listOrders();
  return orders.map((raw) => {
    const status = normalizeOrderStatus(raw.status);
    const history =
      raw.statusHistory && raw.statusHistory.length > 0
        ? raw.statusHistory.map((event) => ({
            ...event,
            status: normalizeOrderStatus(event.status),
          }))
        : [{ status, at: raw.updatedAt ?? raw.createdAt }];
    return { ...raw, status, statusHistory: history };
  });
}

export function createOrderFromLine(
  line: OrderLine,
  options?: PlaceOrderOptions,
): Order {
  const ts = new Date().toISOString();
  const smart = options?.quote;
  const fallback = quoteOrder(line);
  const subtotal = smart?.subtotal ?? fallback.subtotal;
  const delivery = smart?.delivery ?? fallback.delivery;
  const total = smart?.total ?? fallback.total;

  let pricing: OrderPricingSnapshot | undefined;
  if (smart && isSmartQuote(smart) && smart.vendor) {
    pricing = {
      vendorId: smart.vendor.vendorId,
      vendorName: smart.vendor.vendorName,
      strategy: smart.strategy,
      fulfillmentCost: smart.fulfillmentCost,
      marginPct: smart.marginPct,
      marginAmount: smart.marginAmount,
      productionDays: smart.productionDays,
      deliveryDays: smart.deliveryDays,
      overridden: smart.overridden,
    };
  }

  const hasCheckout = Boolean(options?.checkout);
  const status = hasCheckout ? "order_received" : "quoted";

  return {
    id: uid("ord"),
    status,
    createdAt: ts,
    updatedAt: ts,
    line,
    subtotal,
    delivery,
    total,
    note: options?.note,
    checkout: options?.checkout,
    pricing,
    statusHistory: [{ status, at: ts }],
  };
}

export async function cacheOrderLocally(order: Order): Promise<void> {
  await putOrder(order);
}

/** @deprecated Use API-backed designs via DashboardProvider. */
export async function loadState(): Promise<DashboardState> {
  return {
    user: { name: "Guest creator", email: "", guest: true },
    designs: [],
    orders: await loadOrdersState(),
  };
}

export { quoteSmartOrder };
