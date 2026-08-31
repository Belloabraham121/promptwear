import type {
  AdminCatalog,
  AdminState,
  ProfitSettings,
  Vendor,
  VendorMaterialQuality,
  VendorPrintMethod,
} from "@/lib/admin/types";

function daysFromNow(n: number) {
  return new Date(Date.now() + n * 86400000).toISOString();
}

function daysAgo(n: number) {
  return new Date(Date.now() - n * 86400000).toISOString();
}

const ALL_QUALITIES: VendorMaterialQuality[] = [
  "standard",
  "premium",
  "heavy",
];
const ALL_PRINTS: VendorPrintMethod[] = ["dtf", "screen"];

export function seedCatalog(): AdminCatalog {
  return {
    materials: [
      {
        id: "mat_std",
        name: "Combed cotton jersey",
        gsm: 180,
        composition: "100% cotton",
        costPerUnit: 2800,
        active: true,
      },
      {
        id: "mat_prem",
        name: "Ringspun soft-hand",
        gsm: 200,
        composition: "100% cotton",
        costPerUnit: 4200,
        active: true,
      },
      {
        id: "mat_heavy",
        name: "Heavyweight blank",
        gsm: 220,
        composition: "100% cotton",
        costPerUnit: 5600,
        active: true,
      },
      {
        id: "mat_blend",
        name: "Cotton-poly blend",
        gsm: 160,
        composition: "60/40 cotton-poly",
        costPerUnit: 2400,
        active: false,
      },
    ],
    garments: [
      {
        id: "gar_classic",
        name: "Classic crew tee",
        silhouette: "classic",
        materialId: "mat_std",
        basePrice: 4500,
        active: true,
      },
      {
        id: "gar_oversized",
        name: "Oversized drop shoulder",
        silhouette: "oversized",
        materialId: "mat_heavy",
        basePrice: 8500,
        active: true,
      },
      {
        id: "gar_fitted",
        name: "Fitted premium tee",
        silhouette: "fitted",
        materialId: "mat_prem",
        basePrice: 6500,
        active: true,
      },
    ],
    colors: [
      { id: "col_ink", name: "Ink", hex: "#070807", active: true },
      { id: "col_bone", name: "Bone", hex: "#f3f0e8", active: true },
      { id: "col_lime", name: "Lime", hex: "#d6ff3c", active: true },
      { id: "col_navy", name: "Navy", hex: "#1a2744", active: true },
      { id: "col_oxblood", name: "Oxblood", hex: "#5c1a1a", active: false },
    ],
    sizes: [
      { id: "sz_s", label: "S", sortOrder: 1, active: true },
      { id: "sz_m", label: "M", sortOrder: 2, active: true },
      { id: "sz_l", label: "L", sortOrder: 3, active: true },
      { id: "sz_xl", label: "XL", sortOrder: 4, active: true },
      { id: "sz_xxl", label: "XXL", sortOrder: 5, active: true },
    ],
  };
}

export function seedVendors(): Vendor[] {
  return [
    {
      id: "ven_lagos_press",
      name: "Lagos Press Co.",
      location: "Ikeja, Lagos",
      qualityRating: 4.6,
      customerRating: 4.5,
      capacityPerWeek: 1200,
      priceIndex: 1.0,
      onTimeRate: 0.94,
      active: true,
      notes: "Primary DTF partner — strong Lagos SLA.",
      garmentCostByQuality: {
        standard: 4200,
        premium: 6100,
        heavy: 8000,
      },
      printingCostByMethod: { dtf: 2400, screen: 1700 },
      materialAvailable: ALL_QUALITIES,
      printMethods: ALL_PRINTS,
      deliveryRegions: ["Lagos", "Ogun", "Ibadan", "Nationwide"],
      shippingCostBase: 1800,
      shippingCostPerUnit: 80,
      estimatedProductionDays: 3,
      deliverySlaDays: 6,
    },
    {
      id: "ven_abuja_screen",
      name: "Capital Screenworks",
      location: "Wuse II, Abuja",
      qualityRating: 4.2,
      customerRating: 4.1,
      capacityPerWeek: 800,
      priceIndex: 0.92,
      onTimeRate: 0.88,
      active: true,
      notes: "Best for bulk screen runs — north-central coverage.",
      garmentCostByQuality: {
        standard: 3900,
        premium: 5800,
        heavy: 7600,
      },
      printingCostByMethod: { dtf: 2600, screen: 1400 },
      materialAvailable: ["standard", "premium", "heavy"],
      printMethods: ALL_PRINTS,
      deliveryRegions: ["Abuja", "Kaduna", "Kano", "Nationwide"],
      shippingCostBase: 2200,
      shippingCostPerUnit: 95,
      estimatedProductionDays: 4,
      deliverySlaDays: 7,
    },
    {
      id: "ven_ph_knit",
      name: "Delta Knit Labs",
      location: "Port Harcourt",
      qualityRating: 3.9,
      customerRating: 3.7,
      capacityPerWeek: 500,
      priceIndex: 0.85,
      onTimeRate: 0.81,
      active: true,
      excluded: false,
      notes: "Lowest unit cost — slower SLA outside South-South.",
      garmentCostByQuality: {
        standard: 3600,
        premium: 5400,
        heavy: 7200,
      },
      printingCostByMethod: { dtf: 2200, screen: 1500 },
      materialAvailable: ["standard", "premium"],
      printMethods: ["dtf", "screen"],
      deliveryRegions: ["Port Harcourt", "Rivers", "Bayelsa", "Nationwide"],
      shippingCostBase: 2500,
      shippingCostPerUnit: 110,
      estimatedProductionDays: 5,
      deliverySlaDays: 9,
    },
    {
      id: "ven_ibeju_premium",
      name: "Atlantic Premium Print",
      location: "Lekki, Lagos",
      qualityRating: 4.9,
      customerRating: 4.8,
      capacityPerWeek: 350,
      priceIndex: 1.18,
      onTimeRate: 0.97,
      active: true,
      notes: "Highest quality / fastest Lagos turnaround.",
      garmentCostByQuality: {
        standard: 4800,
        premium: 7200,
        heavy: 9200,
      },
      printingCostByMethod: { dtf: 2800, screen: 2100 },
      materialAvailable: ALL_QUALITIES,
      printMethods: ["dtf"],
      deliveryRegions: ["Lagos", "Nationwide"],
      shippingCostBase: 1500,
      shippingCostPerUnit: 70,
      estimatedProductionDays: 2,
      deliverySlaDays: 5,
    },
  ];
}

export function seedProfit(): ProfitSettings {
  return {
    defaultMarginPct: 28,
    rushMarginPct: 38,
    minMarginPct: 15,
    maxMarginPct: 45,
    selectionStrategy: "lowest_cost",
    excludedVendorIds: [],
    overrideVendorId: null,
    promotions: [
      {
        id: "promo_campus",
        name: "Campus launch week",
        description: "Extra 5% off quotes over 20 pcs for campus crews.",
        active: true,
        startsAt: daysAgo(2),
        endsAt: daysFromNow(12),
      },
      {
        id: "promo_dry",
        name: "Dry-season blank push",
        description: "Highlight oversized blanks in studio.",
        active: false,
        startsAt: daysFromNow(20),
        endsAt: daysFromNow(50),
      },
    ],
    discounts: [
      {
        id: "disc_bulk20",
        name: "Bulk 20+",
        type: "percent",
        value: 8,
        minQty: 20,
        active: true,
      },
      {
        id: "disc_bulk50",
        name: "Bulk 50+",
        type: "percent",
        value: 12,
        minQty: 50,
        active: true,
      },
      {
        id: "disc_flat_setup",
        name: "Setup waiver",
        type: "flat",
        value: 5000,
        minQty: 24,
        active: false,
      },
    ],
    coupons: [
      {
        id: "cpn_welcome",
        code: "WELCOME10",
        type: "percent",
        value: 10,
        maxRedemptions: 100,
        redemptions: 34,
        active: true,
        expiresAt: daysFromNow(45),
      },
      {
        id: "cpn_crew",
        code: "CREW2K",
        type: "flat",
        value: 2000,
        maxRedemptions: 50,
        redemptions: 12,
        active: true,
        expiresAt: daysFromNow(20),
      },
      {
        id: "cpn_expired",
        code: "DROP2024",
        type: "percent",
        value: 15,
        maxRedemptions: 25,
        redemptions: 25,
        active: false,
        expiresAt: daysAgo(10),
      },
    ],
  };
}

export function seedAdminState(): AdminState {
  return {
    catalog: seedCatalog(),
    vendors: seedVendors(),
    profit: seedProfit(),
  };
}

/** Fill missing smart-pricing fields on older persisted vendors. */
export function normalizeVendor(raw: Partial<Vendor> & { id: string }): Vendor {
  const defaults = seedVendors()[0];
  return {
    id: raw.id,
    name: raw.name ?? "Vendor",
    location: raw.location ?? "Nigeria",
    qualityRating: raw.qualityRating ?? 4,
    customerRating: raw.customerRating ?? raw.qualityRating ?? 4,
    capacityPerWeek: raw.capacityPerWeek ?? 400,
    priceIndex: raw.priceIndex ?? 1,
    onTimeRate: raw.onTimeRate ?? 0.9,
    active: raw.active ?? true,
    excluded: raw.excluded ?? false,
    notes: raw.notes,
    garmentCostByQuality: raw.garmentCostByQuality ?? {
      standard: Math.round(4200 * (raw.priceIndex ?? 1)),
      premium: Math.round(6100 * (raw.priceIndex ?? 1)),
      heavy: Math.round(8000 * (raw.priceIndex ?? 1)),
    },
    printingCostByMethod: raw.printingCostByMethod ?? {
      dtf: Math.round(2400 * (raw.priceIndex ?? 1)),
      screen: Math.round(1700 * (raw.priceIndex ?? 1)),
    },
    materialAvailable: raw.materialAvailable ?? ALL_QUALITIES,
    printMethods: raw.printMethods ?? ALL_PRINTS,
    deliveryRegions: raw.deliveryRegions ?? ["Nationwide"],
    shippingCostBase: raw.shippingCostBase ?? defaults.shippingCostBase,
    shippingCostPerUnit:
      raw.shippingCostPerUnit ?? defaults.shippingCostPerUnit,
    estimatedProductionDays: raw.estimatedProductionDays ?? 4,
    deliverySlaDays: raw.deliverySlaDays ?? 7,
  };
}

export function normalizeProfit(
  raw: Partial<ProfitSettings> | undefined,
): ProfitSettings {
  const seeded = seedProfit();
  return {
    ...seeded,
    ...raw,
    defaultMarginPct: raw?.defaultMarginPct ?? seeded.defaultMarginPct,
    rushMarginPct: raw?.rushMarginPct ?? seeded.rushMarginPct,
    minMarginPct: raw?.minMarginPct ?? seeded.minMarginPct,
    maxMarginPct: raw?.maxMarginPct ?? seeded.maxMarginPct,
    selectionStrategy: raw?.selectionStrategy ?? seeded.selectionStrategy,
    excludedVendorIds: raw?.excludedVendorIds ?? [],
    overrideVendorId: raw?.overrideVendorId ?? null,
    promotions: raw?.promotions ?? seeded.promotions,
    discounts: raw?.discounts ?? seeded.discounts,
    coupons: raw?.coupons ?? seeded.coupons,
  };
}
