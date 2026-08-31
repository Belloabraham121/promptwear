export type MaterialResponse = {
  id: string;
  name: string;
  gsm: number;
  composition: string;
  costPerUnit: number;
  active: boolean;
};

export type AdminGarmentResponse = {
  id: string;
  name: string;
  silhouette: 'classic' | 'oversized' | 'fitted';
  materialId: string;
  basePrice: number;
  active: boolean;
};

export type ProductColorResponse = {
  id: string;
  name: string;
  hex: string;
  active: boolean;
};

export type ProductSizeResponse = {
  id: string;
  label: string;
  sortOrder: number;
  active: boolean;
};

export type AdminCatalogResponse = {
  materials: MaterialResponse[];
  garments: AdminGarmentResponse[];
  colors: ProductColorResponse[];
  sizes: ProductSizeResponse[];
};

export type VendorMaterialQuality = 'standard' | 'premium' | 'heavy';
export type VendorPrintMethod = 'dtf' | 'screen';

export type VendorResponse = {
  id: string;
  name: string;
  location: string;
  qualityRating: number;
  customerRating: number;
  capacityPerWeek: number;
  priceIndex: number;
  onTimeRate: number;
  active: boolean;
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
  deliverySlaDays: number;
};

export type VendorSelectionStrategy =
  | 'lowest_cost'
  | 'highest_quality'
  | 'fastest_delivery';

export type PromotionResponse = {
  id: string;
  name: string;
  description: string;
  active: boolean;
  startsAt: string;
  endsAt: string;
};

export type DiscountResponse = {
  id: string;
  name: string;
  type: 'percent' | 'flat';
  value: number;
  minQty: number;
  active: boolean;
};

export type CouponResponse = {
  id: string;
  code: string;
  type: 'percent' | 'flat';
  value: number;
  maxRedemptions: number;
  redemptions: number;
  active: boolean;
  expiresAt: string;
};

export type ProfitSettingsResponse = {
  defaultMarginPct: number;
  rushMarginPct: number;
  minMarginPct: number;
  maxMarginPct: number;
  selectionStrategy: VendorSelectionStrategy;
  excludedVendorIds: string[];
  overrideVendorId: string | null;
  promotions: PromotionResponse[];
  discounts: DiscountResponse[];
  coupons: CouponResponse[];
};

export const VENDOR_QUALITIES: VendorMaterialQuality[] = [
  'standard',
  'premium',
  'heavy',
];

export const VENDOR_PRINT_METHODS: VendorPrintMethod[] = ['dtf', 'screen'];
