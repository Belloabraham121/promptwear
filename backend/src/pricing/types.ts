export type GarmentQuality = 'standard' | 'premium' | 'heavy';
export type PrintMethod = 'dtf' | 'screen';
export type SizeKey = 'S' | 'M' | 'L' | 'XL' | 'XXL';
export type SizeBreakdown = Record<SizeKey, number>;

export const SIZES: SizeKey[] = ['S', 'M', 'L', 'XL', 'XXL'];

export type VendorPrintMethod = 'dtf' | 'screen';
export type VendorMaterialQuality = 'standard' | 'premium' | 'heavy';

export type VendorSelectionStrategy =
  | 'lowest_cost'
  | 'highest_quality'
  | 'fastest_delivery';

export type Vendor = {
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

export type ProfitSettings = {
  defaultMarginPct: number;
  rushMarginPct: number;
  minMarginPct: number;
  maxMarginPct: number;
  selectionStrategy: VendorSelectionStrategy;
  excludedVendorIds: string[];
  overrideVendorId: string | null;
};

export type PricingInput = {
  quality: GarmentQuality;
  print: PrintMethod;
  sizes: SizeBreakdown;
  deliveryCity?: string;
  deliveryState?: string;
  rush?: boolean;
};

export type VendorQuote = {
  vendorId: string;
  vendorName: string;
  eligible: boolean;
  reason?: string;
  garmentCost: number;
  printingCost: number;
  shippingCost: number;
  setupFee: number;
  fulfillmentCost: number;
  qualityScore: number;
  customerRating: number;
  productionDays: number;
  shippingDays: number;
  totalDays: number;
  meetsSla: boolean;
  materialOk: boolean;
  printMethodOk: boolean;
  capacityOk: boolean;
  regionMatch: boolean;
};

export type SmartQuote = {
  qty: number;
  strategy: VendorSelectionStrategy;
  marginPct: number;
  fulfillmentCost: number;
  marginAmount: number;
  subtotal: number;
  delivery: number;
  total: number;
  productionDays: number;
  deliveryDays: number;
  vendor: VendorQuote | null;
  candidates: VendorQuote[];
  overridden: boolean;
};

export type CouponDiscountType = 'percent' | 'flat';

export type CouponDiscount = {
  couponId: string;
  code: string;
  type: CouponDiscountType;
  value: number;
  discountAmount: number;
};

export type PricedQuote = SmartQuote & {
  coupon?: CouponDiscount;
  discountAmount: number;
  grandTotal: number;
};
