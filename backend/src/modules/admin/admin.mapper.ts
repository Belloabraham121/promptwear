import {
  Coupon,
  Discount,
  Garment,
  Material,
  Prisma,
  ProductColor,
  ProductSize,
  Promotion,
  ProfitSettings,
  Vendor,
} from '@prisma/client';
import {
  AdminCatalogResponse,
  AdminGarmentResponse,
  CouponResponse,
  DiscountResponse,
  MaterialResponse,
  ProductColorResponse,
  ProductSizeResponse,
  PromotionResponse,
  ProfitSettingsResponse,
  VENDOR_PRINT_METHODS,
  VENDOR_QUALITIES,
  VendorMaterialQuality,
  VendorPrintMethod,
  VendorResponse,
} from './admin.types';

function normalizeGarmentCostByQuality(
  value: Prisma.JsonValue,
): Record<VendorMaterialQuality, number> {
  const result = {
    standard: 0,
    premium: 0,
    heavy: 0,
  };

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return result;
  }

  for (const quality of VENDOR_QUALITIES) {
    const entry = (value as Record<string, unknown>)[quality];
    if (typeof entry === 'number') {
      result[quality] = entry;
    }
  }

  return result;
}

function normalizePrintingCostByMethod(
  value: Prisma.JsonValue,
): Record<VendorPrintMethod, number> {
  const result = { dtf: 0, screen: 0 };

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return result;
  }

  for (const method of VENDOR_PRINT_METHODS) {
    const entry = (value as Record<string, unknown>)[method];
    if (typeof entry === 'number') {
      result[method] = entry;
    }
  }

  return result;
}

function normalizeStringArray(value: Prisma.JsonValue): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === 'string');
}

function normalizeQualityArray(value: Prisma.JsonValue): VendorMaterialQuality[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (entry): entry is VendorMaterialQuality =>
      typeof entry === 'string' &&
      VENDOR_QUALITIES.includes(entry as VendorMaterialQuality),
  );
}

function normalizePrintMethodArray(value: Prisma.JsonValue): VendorPrintMethod[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (entry): entry is VendorPrintMethod =>
      typeof entry === 'string' &&
      VENDOR_PRINT_METHODS.includes(entry as VendorPrintMethod),
  );
}

export function toMaterialResponse(material: Material): MaterialResponse {
  return {
    id: material.id,
    name: material.name,
    gsm: material.gsm,
    composition: material.composition,
    costPerUnit: material.costPerUnit,
    active: material.active,
  };
}

export function toAdminGarmentResponse(garment: Garment): AdminGarmentResponse {
  return {
    id: garment.id,
    name: garment.name,
    silhouette: garment.silhouette,
    materialId: garment.materialId,
    basePrice: garment.basePrice,
    active: garment.active,
  };
}

export function toProductColorResponse(color: ProductColor): ProductColorResponse {
  return {
    id: color.id,
    name: color.name,
    hex: color.hex,
    active: color.active,
  };
}

export function toProductSizeResponse(size: ProductSize): ProductSizeResponse {
  return {
    id: size.id,
    label: size.label,
    sortOrder: size.sortOrder,
    active: size.active,
  };
}

export function toAdminCatalogResponse(
  materials: Material[],
  garments: Garment[],
  colors: ProductColor[],
  sizes: ProductSize[],
): AdminCatalogResponse {
  return {
    materials: materials.map(toMaterialResponse),
    garments: garments.map(toAdminGarmentResponse),
    colors: colors.map(toProductColorResponse),
    sizes: sizes.map(toProductSizeResponse),
  };
}

export function toVendorResponse(vendor: Vendor): VendorResponse {
  return {
    id: vendor.id,
    name: vendor.name,
    location: vendor.location,
    qualityRating: vendor.qualityRating,
    customerRating: vendor.customerRating,
    capacityPerWeek: vendor.capacityPerWeek,
    priceIndex: vendor.priceIndex,
    onTimeRate: vendor.onTimeRate,
    active: vendor.active,
    ...(vendor.excluded ? { excluded: vendor.excluded } : {}),
    ...(vendor.notes ? { notes: vendor.notes } : {}),
    garmentCostByQuality: normalizeGarmentCostByQuality(
      vendor.garmentCostByQuality,
    ),
    printingCostByMethod: normalizePrintingCostByMethod(
      vendor.printingCostByMethod,
    ),
    materialAvailable: normalizeQualityArray(vendor.materialAvailable),
    printMethods: normalizePrintMethodArray(vendor.printMethods),
    deliveryRegions: normalizeStringArray(vendor.deliveryRegions),
    shippingCostBase: vendor.shippingCostBase,
    shippingCostPerUnit: vendor.shippingCostPerUnit,
    estimatedProductionDays: vendor.estimatedProductionDays,
    deliverySlaDays: vendor.deliverySlaDays,
  };
}

export function toPromotionResponse(promotion: Promotion): PromotionResponse {
  return {
    id: promotion.id,
    name: promotion.name,
    description: promotion.description,
    active: promotion.active,
    startsAt: promotion.startsAt.toISOString(),
    endsAt: promotion.endsAt.toISOString(),
  };
}

export function toDiscountResponse(discount: Discount): DiscountResponse {
  return {
    id: discount.id,
    name: discount.name,
    type: discount.type,
    value: discount.value,
    minQty: discount.minQty,
    active: discount.active,
  };
}

export function toCouponResponse(coupon: Coupon): CouponResponse {
  return {
    id: coupon.id,
    code: coupon.code,
    type: coupon.type,
    value: coupon.value,
    maxRedemptions: coupon.maxRedemptions,
    redemptions: coupon.redemptionCount,
    active: coupon.active,
    expiresAt: coupon.expiresAt.toISOString(),
  };
}

type ProfitSettingsWithRelations = ProfitSettings & {
  promotions: Promotion[];
  discounts: Discount[];
  coupons: Coupon[];
};

export function toProfitSettingsResponse(
  settings: ProfitSettingsWithRelations,
): ProfitSettingsResponse {
  const excludedVendorIds = normalizeStringArray(settings.excludedVendorIds);

  return {
    defaultMarginPct: settings.defaultMarginPct,
    rushMarginPct: settings.rushMarginPct,
    minMarginPct: settings.minMarginPct,
    maxMarginPct: settings.maxMarginPct,
    selectionStrategy: settings.selectionStrategy,
    excludedVendorIds,
    overrideVendorId: settings.overrideVendorId,
    promotions: settings.promotions.map(toPromotionResponse),
    discounts: settings.discounts.map(toDiscountResponse),
    coupons: settings.coupons.map(toCouponResponse),
  };
}

export function toVendorGarmentCostJson(
  value: Record<VendorMaterialQuality, number>,
): Prisma.InputJsonValue {
  return value;
}

export function toVendorPrintingCostJson(
  value: Record<VendorPrintMethod, number>,
): Prisma.InputJsonValue {
  return value;
}
