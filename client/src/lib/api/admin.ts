import { api } from "@/lib/api/client";
import type {
  AdminCatalog,
  AdminGarment,
  Coupon,
  Discount,
  Material,
  ProductColor,
  ProductSize,
  ProfitSettings,
  Promotion,
  Vendor,
  VendorMaterialQuality,
  VendorPrintMethod,
} from "@/lib/admin/types";
import type {
  Order,
  OrderResponse,
  OrderStatus,
} from "@/lib/dashboard/types";
import { mapOrderFromApi } from "@/lib/dashboard/types";

export type PaginatedOrders = {
  items: Order[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type ListAdminOrdersParams = {
  page?: number;
  limit?: number;
  status?: OrderStatus;
};

export type CreateVendorInput = {
  name: string;
  location: string;
  qualityRating?: number;
  capacityPerWeek?: number;
  priceIndex?: number;
  onTimeRate?: number;
  notes?: string;
};

type CatalogKey = keyof AdminCatalog;

const CATALOG_PATHS: Record<CatalogKey, string> = {
  materials: "materials",
  garments: "garments",
  colors: "colors",
  sizes: "sizes",
};

function adminOrdersPath(params: ListAdminOrdersParams = {}): string {
  const search = new URLSearchParams();
  if (params.page !== undefined) search.set("page", String(params.page));
  if (params.limit !== undefined) search.set("limit", String(params.limit));
  if (params.status) search.set("status", params.status);
  const query = search.toString();
  return query ? `/admin/orders?${query}` : "/admin/orders";
}

function mapPaginatedOrders(response: {
  items: OrderResponse[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}): PaginatedOrders {
  return {
    ...response,
    items: response.items.map(mapOrderFromApi),
  };
}

export function getAdminCatalog() {
  return api.get<AdminCatalog>("/admin/catalog");
}

export function updateCatalogMaterial(id: string, patch: Partial<Material>) {
  return api.patch<Material>(`/admin/catalog/materials/${id}`, patch);
}

export function updateCatalogGarment(id: string, patch: Partial<AdminGarment>) {
  return api.patch<AdminGarment>(`/admin/catalog/garments/${id}`, patch);
}

export function updateCatalogColor(id: string, patch: Partial<ProductColor>) {
  return api.patch<ProductColor>(`/admin/catalog/colors/${id}`, patch);
}

export function updateCatalogSize(id: string, patch: Partial<ProductSize>) {
  return api.patch<ProductSize>(`/admin/catalog/sizes/${id}`, patch);
}

export function updateCatalogItem<K extends CatalogKey>(
  key: K,
  id: string,
  patch: Partial<AdminCatalog[K][number]>,
) {
  const segment = CATALOG_PATHS[key];
  return api.patch<AdminCatalog[K][number]>(
    `/admin/catalog/${segment}/${id}`,
    patch,
  );
}

export function listVendors() {
  return api.get<Vendor[]>("/admin/vendors");
}

export function buildCreateVendorBody(input: CreateVendorInput) {
  const priceIndex = input.priceIndex ?? 1;
  return {
    name: input.name.trim() || "New vendor",
    location: input.location.trim() || "Nigeria",
    qualityRating: input.qualityRating ?? 4,
    customerRating: input.qualityRating ?? 4,
    capacityPerWeek: input.capacityPerWeek ?? 400,
    priceIndex,
    onTimeRate: input.onTimeRate ?? 0.9,
    active: true,
    notes: input.notes,
    garmentCostByQuality: {
      standard: 4000,
      premium: 6000,
      heavy: 8000,
    },
    printingCostByMethod: {
      dtf: 2000,
      screen: 1500,
    },
    materialAvailable: ["standard", "premium"] as VendorMaterialQuality[],
    printMethods: ["dtf"] as VendorPrintMethod[],
    deliveryRegions: ["Lagos"],
    shippingCostBase: 1500,
    shippingCostPerUnit: 100,
    estimatedProductionDays: 3,
    deliverySlaDays: 7,
  };
}

export function createVendor(input: CreateVendorInput) {
  return api.post<Vendor>("/admin/vendors", buildCreateVendorBody(input));
}

export function updateVendor(id: string, patch: Partial<Vendor>) {
  return api.patch<Vendor>(`/admin/vendors/${id}`, patch);
}

export function removeVendor(id: string) {
  return api.delete<{ id: string }>(`/admin/vendors/${id}`);
}

export function getProfitSettings() {
  return api.get<ProfitSettings>("/admin/profit");
}

export function updateProfitSettings(
  patch: Partial<
    Pick<
      ProfitSettings,
      | "defaultMarginPct"
      | "rushMarginPct"
      | "minMarginPct"
      | "maxMarginPct"
      | "selectionStrategy"
      | "excludedVendorIds"
      | "overrideVendorId"
    >
  >,
) {
  return api.patch<ProfitSettings>("/admin/profit", patch);
}

export function createPromotion(input: { name: string; description: string }) {
  const now = Date.now();
  return api.post<Promotion>("/admin/profit/promotions", {
    name: input.name.trim() || "New promotion",
    description: input.description.trim(),
    active: true,
    startsAt: new Date(now).toISOString(),
    endsAt: new Date(now + 14 * 86400000).toISOString(),
  });
}

export function updatePromotion(id: string, patch: Partial<Promotion>) {
  return api.patch<Promotion>(`/admin/profit/promotions/${id}`, patch);
}

export function createDiscount(input: {
  name: string;
  type: Discount["type"];
  value: number;
  minQty: number;
}) {
  return api.post<Discount>("/admin/profit/discounts", {
    name: input.name.trim() || "New discount",
    type: input.type,
    value: input.value,
    minQty: input.minQty,
    active: true,
  });
}

export function updateDiscount(id: string, patch: Partial<Discount>) {
  return api.patch<Discount>(`/admin/profit/discounts/${id}`, patch);
}

export function createCoupon(input: {
  code: string;
  type: Coupon["type"];
  value: number;
}) {
  return api.post<Coupon>("/admin/profit/coupons", {
    code: input.code.trim().toUpperCase() || "CODE",
    type: input.type,
    value: input.value,
    maxRedemptions: 50,
    active: true,
    expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
  });
}

export function updateCoupon(id: string, patch: Partial<Coupon>) {
  return api.patch<Coupon>(`/admin/profit/coupons/${id}`, patch);
}

export function removeCoupon(id: string) {
  return api.delete<{ id: string }>(`/admin/profit/coupons/${id}`);
}

export function listAdminOrders(params: ListAdminOrdersParams = {}) {
  return api
    .get<{
      items: OrderResponse[];
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    }>(adminOrdersPath(params))
    .then(mapPaginatedOrders);
}

export function updateAdminOrderStatus(id: string, status: OrderStatus) {
  return api
    .patch<OrderResponse>(`/admin/orders/${id}/status`, { status })
    .then(mapOrderFromApi);
}

export function cancelAdminOrder(id: string) {
  return api.post<OrderResponse>(`/admin/orders/${id}/cancel`).then(mapOrderFromApi);
}

export function refundAdminOrder(id: string) {
  return api.post<OrderResponse>(`/admin/orders/${id}/refund`).then(mapOrderFromApi);
}
