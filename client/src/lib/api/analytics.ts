import { api } from "@/lib/api/client";
import type {
  AnalyticsSnapshot,
  BestSellingRow,
  RevenueSeriesPoint,
} from "@/lib/admin/analytics";

export type { AnalyticsSnapshot, BestSellingRow, RevenueSeriesPoint };

export function getAnalyticsSnapshot() {
  return api.get<AnalyticsSnapshot>("/admin/analytics");
}

export function getRevenueSeries(from: string, to: string) {
  const search = new URLSearchParams({ from, to });
  return api.get<RevenueSeriesPoint[]>(
    `/admin/analytics/revenue?${search.toString()}`,
  );
}

export function getBestsellers() {
  return api.get<BestSellingRow[]>("/admin/analytics/bestsellers");
}
