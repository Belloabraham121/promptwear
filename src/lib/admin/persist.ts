"use client";

import {
  normalizeProfit,
  normalizeVendor,
  seedAdminState,
} from "@/lib/admin/store";
import type {
  AdminCatalog,
  AdminGarment,
  AdminState,
  Coupon,
  Discount,
  Material,
  ProductColor,
  ProductSize,
  ProfitSettings,
  Promotion,
  Vendor,
} from "@/lib/admin/types";
import { getMeta, setMeta, uid } from "@/lib/db/client";

const ADMIN_META = "admin.state.v2";
const ADMIN_META_LEGACY = "admin.state.v1";

function normalizeAdminState(raw: AdminState): AdminState {
  return {
    catalog: raw.catalog,
    vendors: (raw.vendors ?? []).map((v) => normalizeVendor(v)),
    profit: normalizeProfit(raw.profit),
  };
}

export async function loadAdminState(): Promise<AdminState> {
  const existing = await getMeta<AdminState>(ADMIN_META);
  if (existing?.catalog && existing?.vendors && existing?.profit) {
    const normalized = normalizeAdminState(existing);
    // Persist normalized shape so new vendor fields stick after first load.
    await setMeta(ADMIN_META, normalized);
    return normalized;
  }

  const legacy = await getMeta<AdminState>(ADMIN_META_LEGACY);
  if (legacy?.catalog && legacy?.vendors && legacy?.profit) {
    const merged: AdminState = {
      catalog: legacy.catalog,
      vendors: mergeVendorsWithSeed(legacy.vendors),
      profit: normalizeProfit(legacy.profit),
    };
    await setMeta(ADMIN_META, merged);
    return merged;
  }

  const seeded = seedAdminState();
  await setMeta(ADMIN_META, seeded);
  return seeded;
}

/** Keep legacy vendor edits; backfill any missing seed partners for demo. */
function mergeVendorsWithSeed(legacy: Vendor[]): Vendor[] {
  const seeded = seedAdminState().vendors;
  const byId = new Map(legacy.map((v) => [v.id, normalizeVendor(v)]));
  for (const seed of seeded) {
    if (!byId.has(seed.id)) byId.set(seed.id, seed);
  }
  return [...byId.values()];
}

export async function saveAdminState(state: AdminState): Promise<void> {
  await setMeta(ADMIN_META, normalizeAdminState(state));
}

export function createVendor(input: {
  name: string;
  location: string;
  qualityRating?: number;
  capacityPerWeek?: number;
  priceIndex?: number;
  onTimeRate?: number;
  notes?: string;
}): Vendor {
  const priceIndex = input.priceIndex ?? 1;
  return normalizeVendor({
    id: uid("ven"),
    name: input.name.trim() || "New vendor",
    location: input.location.trim() || "Nigeria",
    qualityRating: input.qualityRating ?? 4,
    customerRating: input.qualityRating ?? 4,
    capacityPerWeek: input.capacityPerWeek ?? 400,
    priceIndex,
    onTimeRate: input.onTimeRate ?? 0.9,
    active: true,
    notes: input.notes,
  });
}

export function createCoupon(input: {
  code: string;
  type: Coupon["type"];
  value: number;
}): Coupon {
  return {
    id: uid("cpn"),
    code: input.code.trim().toUpperCase() || "CODE",
    type: input.type,
    value: input.value,
    maxRedemptions: 50,
    redemptions: 0,
    active: true,
    expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
  };
}

export function createPromotion(input: {
  name: string;
  description: string;
}): Promotion {
  const now = Date.now();
  return {
    id: uid("promo"),
    name: input.name.trim() || "New promotion",
    description: input.description.trim() || "",
    active: true,
    startsAt: new Date(now).toISOString(),
    endsAt: new Date(now + 14 * 86400000).toISOString(),
  };
}

export function createDiscount(input: {
  name: string;
  type: Discount["type"];
  value: number;
  minQty: number;
}): Discount {
  return {
    id: uid("disc"),
    name: input.name.trim() || "New discount",
    type: input.type,
    value: input.value,
    minQty: input.minQty,
    active: true,
  };
}

export function patchCatalogItem<
  K extends keyof AdminCatalog,
  T extends AdminCatalog[K][number],
>(catalog: AdminCatalog, key: K, id: string, patch: Partial<T>): AdminCatalog {
  return {
    ...catalog,
    [key]: (catalog[key] as T[]).map((item) =>
      item.id === id ? { ...item, ...patch } : item,
    ),
  };
}

export type { Material, AdminGarment, ProductColor, ProductSize, ProfitSettings };
