export type BestSellingRow = {
  title: string;
  units: number;
  revenue: number;
};

export type AnalyticsSnapshot = {
  revenue: number;
  revenueLabel: string;
  orderCount: number;
  conversionRate: number;
  conversionLabel: string;
  userCount: number;
  customerCount: number;
  activeVendorCount: number;
  vendorCount: number;
  bestSelling: BestSellingRow[];
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

export type RevenueSeriesPoint = {
  date: string;
  revenue: number;
  orderCount: number;
};

export type DailyRollup = {
  date: string;
  revenue: number;
  orderCount: number;
  bestSelling: { designId: string; title: string; units: number; revenue: number }[];
};

export type OrderLineSnapshot = {
  designId: string;
  designTitle: string;
  sizes: Record<string, number>;
};
