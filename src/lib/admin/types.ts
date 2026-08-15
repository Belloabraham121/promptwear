export type AdminRole = "customer" | "admin";

export type Material = {
  id: string;
  name: string;
  gsm: number;
  composition: string;
  costPerUnit: number;
  active: boolean;
};

export type AdminGarment = {
  id: string;
  name: string;
  silhouette: "classic" | "oversized" | "fitted";
  materialId: string;
  basePrice: number;
  active: boolean;
};

export type ProductColor = {
  id: string;
  name: string;
  hex: string;
  active: boolean;
};

export type ProductSize = {
  id: string;
  label: string;
  sortOrder: number;
  active: boolean;
};

export type VendorPrintMethod = "dtf" | "screen";
export type VendorMaterialQuality = "standard" | "premium" | "heavy";

export type VendorSelectionStrategy =
  | "lowest_cost"
  | "highest_quality"
  | "fastest_delivery";

export type Vendor = {
  id: string;
  name: string;
  location: string;
  /** Vendor quality score 1–5 */
  qualityRating: number;
  /** Historical customer ratings 1–5 */
  customerRating: number;
  capacityPerWeek: number;
  /** Cost multiplier applied on top of explicit garment/print costs */
  priceIndex: number;
  onTimeRate: number;
  active: boolean;
  /** Soft exclude without deleting (also mirrored in profit.excludedVendorIds) */
  excluded?: boolean;
  notes?: string;
  garmentCostByQuality: Record<VendorMaterialQuality, number>;
  printingCostByMethod: Record<VendorPrintMethod, number>;
  materialAvailable: VendorMaterialQuality[];
  printMethods: VendorPrintMethod[];
  deliveryRegions: string[];
  shippingCostBase: number;
  shippingCostPerUnit: number;
  estimatedProductionDays: number;
  /** Target delivery window (days). Platform SLA target is 7. */
  deliverySlaDays: number;
};

export type ProfitSettings = {
  defaultMarginPct: number;
  rushMarginPct: number;
  minMarginPct: number;
  maxMarginPct: number;
  selectionStrategy: VendorSelectionStrategy;
  excludedVendorIds: string[];
  /** Force this vendor when eligible; null = automatic */
  overrideVendorId: string | null;
  promotions: Promotion[];
  discounts: Discount[];
  coupons: Coupon[];
};

export type Promotion = {
  id: string;
  name: string;
  description: string;
  active: boolean;
  startsAt: string;
  endsAt: string;
};

export type Discount = {
  id: string;
  name: string;
  type: "percent" | "flat";
  value: number;
  minQty: number;
  active: boolean;
};

export type Coupon = {
  id: string;
  code: string;
  type: "percent" | "flat";
  value: number;
  maxRedemptions: number;
  redemptions: number;
  active: boolean;
  expiresAt: string;
};

export type AdminCatalog = {
  materials: Material[];
  garments: AdminGarment[];
  colors: ProductColor[];
  sizes: ProductSize[];
};

export type AdminState = {
  catalog: AdminCatalog;
  vendors: Vendor[];
  profit: ProfitSettings;
};
