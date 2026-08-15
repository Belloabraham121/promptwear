import type { Order } from "@/lib/dashboard/types";
import type { Vendor } from "@/lib/admin/types";
import { formatNaira, totalQuantity } from "@/lib/dashboard/pricing";

export type AnalyticsSnapshot = {
  revenue: number;
  revenueLabel: string;
  orderCount: number;
  conversionRate: number;
  conversionLabel: string;
  bestSelling: { title: string; units: number; revenue: number }[];
  repeatCustomers: { label: string; count: number; hint: string };
  vendorPerformance: {
    id: string;
    name: string;
    qualityRating: number;
    onTimeRate: number;
    capacityPerWeek: number;
    priceIndex: number;
    active: boolean;
  }[];
};

/** Demo analytics: mix real local orders with stubbed platform figures. */
export function buildAnalytics(
  orders: Order[],
  vendors: Vendor[],
  designCount: number,
): AnalyticsSnapshot {
  const countable = orders.filter((o) => o.status !== "cancelled");
  const realRevenue = countable.reduce((sum, o) => sum + o.total, 0);
  /** Stubbed marketplace revenue so the dashboard demos with sparse local data. */
  const stubRevenue = 1_845_000;
  const revenue = realRevenue + stubRevenue;

  const realOrders = orders.length;
  const stubOrders = 47;
  const orderCount = realOrders + stubOrders;

  const conversionRate =
    designCount > 0
      ? Math.min(0.62, (realOrders || 1) / Math.max(designCount, 1))
      : 0.34;

  const byDesign = new Map<
    string,
    { title: string; units: number; revenue: number }
  >();
  for (const order of countable) {
    const key = order.line.designId;
    const prev = byDesign.get(key) ?? {
      title: order.line.designTitle,
      units: 0,
      revenue: 0,
    };
    prev.units += totalQuantity(order.line.sizes);
    prev.revenue += order.total;
    byDesign.set(key, prev);
  }

  const seededBest = [
    { title: "Chrome heart flame", units: 142, revenue: 1_280_000 },
    { title: "Hostel run 01", units: 96, revenue: 720_000 },
    { title: "Night market type", units: 61, revenue: 490_000 },
  ];

  const fromOrders = [...byDesign.values()].sort((a, b) => b.units - a.units);
  const bestSelling =
    fromOrders.length >= 2
      ? fromOrders.slice(0, 5)
      : [...fromOrders, ...seededBest]
          .filter(
            (row, i, arr) =>
              arr.findIndex((r) => r.title === row.title) === i,
          )
          .slice(0, 5);

  return {
    revenue,
    revenueLabel: formatNaira(revenue),
    orderCount,
    conversionRate,
    conversionLabel: `${Math.round(conversionRate * 100)}%`,
    bestSelling,
    repeatCustomers: {
      label: "Repeat buyers",
      count: 18,
      hint: "Stubbed: customers with 2+ paid orders in 90 days",
    },
    vendorPerformance: vendors.map((v) => ({
      id: v.id,
      name: v.name,
      qualityRating: v.qualityRating,
      onTimeRate: v.onTimeRate,
      capacityPerWeek: v.capacityPerWeek,
      priceIndex: v.priceIndex,
      active: v.active,
    })),
  };
}
