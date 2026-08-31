import { api } from "@/lib/api/client";
import type { VendorSelectionStrategy } from "@/lib/admin/types";
import type {
  GarmentQuality,
  Order,
  OrderCheckout,
  OrderResponse,
  OrderStatus,
  PrintMethod,
  SizeBreakdown,
} from "@/lib/dashboard/types";
import { mapOrderFromApi } from "@/lib/dashboard/types";

export type PaginatedOrdersResponse = {
  items: OrderResponse[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type VendorQuoteResponse = {
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

export type QuoteResponse = {
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
  vendor: VendorQuoteResponse | null;
  candidates: VendorQuoteResponse[];
  overridden: boolean;
  coupon?: {
    couponId: string;
    code: string;
    type: "percent" | "flat";
    value: number;
    discountAmount: number;
  };
  discountAmount: number;
  grandTotal: number;
};

export type CreateQuoteInput = {
  quality: GarmentQuality;
  print: PrintMethod;
  sizes: SizeBreakdown;
  deliveryCity?: string;
  deliveryState?: string;
  rush?: boolean;
  couponCode?: string;
};

export type CreateOrderInput = {
  designId: string;
  quality: GarmentQuality;
  print: PrintMethod;
  sizes: SizeBreakdown;
  rush?: boolean;
  couponCode?: string;
  note?: string;
  checkout: OrderCheckout;
};

export type ListOrdersParams = {
  page?: number;
  limit?: number;
  status?: OrderStatus;
};

function ordersPath(params?: ListOrdersParams): string {
  if (!params) return "/orders";
  const search = new URLSearchParams();
  if (params.page !== undefined) search.set("page", String(params.page));
  if (params.limit !== undefined) search.set("limit", String(params.limit));
  if (params.status) search.set("status", params.status);
  const query = search.toString();
  return query ? `/orders?${query}` : "/orders";
}

export function listOrders(params?: ListOrdersParams) {
  return api.get<PaginatedOrdersResponse>(ordersPath(params)).then((response) => ({
    ...response,
    items: response.items.map(mapOrderFromApi),
  }));
}

export function getOrder(id: string) {
  return api.get<OrderResponse>(`/orders/${id}`).then(mapOrderFromApi);
}

export function createOrder(input: CreateOrderInput, idempotencyKey: string) {
  return api
    .post<OrderResponse>("/orders", input, {
      headers: { "Idempotency-Key": idempotencyKey },
    })
    .then(mapOrderFromApi);
}

export function patchOrderNote(id: string, note?: string) {
  return api.patch<OrderResponse>(`/orders/${id}`, { note }).then(mapOrderFromApi);
}

export function postQuote(input: CreateQuoteInput) {
  return api.post<QuoteResponse>("/orders/quote", input);
}

export type { Order };
