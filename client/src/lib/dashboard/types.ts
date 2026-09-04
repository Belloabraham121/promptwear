export type DesignMethod = "prompt" | "draw" | "hybrid";

export type PatternPanel =
  | "front"
  | "back"
  | "sleeveL"
  | "sleeveR"
  | "collar";

export type StudioBackground = "ink" | "bone" | "white" | "grid";

export type DesignStatus = "draft" | "saved" | "ordered";

/** Fabric.js canvas JSON per pattern panel (serialized). */
export type PanelJson = Record<string, unknown> | null;

export type Design = {
  id: string;
  title: string;
  prompt: string;
  method: DesignMethod;
  color: string;
  background: StudioBackground;
  status: DesignStatus;
  /** Studio garment mesh — classic (full panels) or oversized (CLO) */
  garmentId: "classic" | "oversized";
  activePanel: PatternPanel;
  panels: Record<PatternPanel, PanelJson>;
  /** IndexedDB asset id for PNG/JPEG thumbnail */
  thumbnailAssetId?: string;
  chat: {
    role: "user" | "assistant";
    text: string;
    at: string;
    imageUrl?: string;
    imageAssetId?: string;
  }[];
  createdAt: string;
  updatedAt: string;
};

export type GarmentQuality = "standard" | "premium" | "heavy";
export type PrintMethod = "dtf" | "screen";

/**
 * Fulfillment tracking statuses + cancel/refund.
 * Legacy `paid` / `in_production` are normalized on load.
 */
export type OrderStatus =
  | "draft"
  | "quoted"
  | "order_received"
  | "design_confirmed"
  | "production_assigned"
  | "printing"
  | "quality_check"
  | "packaging"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded"
  /** @deprecated normalized to order_received */
  | "paid"
  /** @deprecated normalized to printing */
  | "in_production";

export type SizeKey = "S" | "M" | "L" | "XL" | "XXL";

export type SizeBreakdown = Record<SizeKey, number>;

export type OrderLine = {
  designId: string;
  designTitle: string;
  color: string;
  quality: GarmentQuality;
  print: PrintMethod;
  sizes: SizeBreakdown;
};

export type PaymentMethod = "card" | "bank_transfer" | "wallet";

export type CheckoutContact = {
  fullName: string;
  email: string;
  phone: string;
};

export type DeliveryAddress = {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode?: string;
  country: string;
};

export type OrderCheckout = {
  contact: CheckoutContact;
  address: DeliveryAddress;
  paymentMethod: PaymentMethod;
};

export type OrderPricingSnapshot = {
  vendorId: string;
  vendorName: string;
  strategy: string;
  fulfillmentCost: number;
  marginPct: number;
  marginAmount: number;
  productionDays: number;
  deliveryDays: number;
  overridden: boolean;
  couponCode?: string;
  discountAmount?: number;
};

export type StatusEvent = {
  status: OrderStatus;
  at: string;
};

export type Order = {
  id: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  line: OrderLine;
  subtotal: number;
  delivery: number;
  total: number;
  note?: string;
  checkout?: OrderCheckout;
  pricing?: OrderPricingSnapshot;
  statusHistory?: StatusEvent[];
};

export type DashboardUser = {
  name: string;
  email: string;
  guest: boolean;
  /** Local demo role — no real auth yet. Toggle on Account or via admin gate. */
  role?: "customer" | "admin";
};

export const SIZES: SizeKey[] = ["S", "M", "L", "XL", "XXL"];

export const PATTERN_PANELS: PatternPanel[] = [
  "front",
  "back",
  "sleeveL",
  "sleeveR",
  "collar",
];

export const PANEL_LABELS: Record<PatternPanel, string> = {
  front: "Front",
  back: "Back",
  sleeveL: "Left sleeve",
  sleeveR: "Right sleeve",
  collar: "Collar",
};

export const EMPTY_PANELS = (): Record<PatternPanel, PanelJson> => ({
  front: null,
  back: null,
  sleeveL: null,
  sleeveR: null,
  collar: null,
});

export const QUALITY_LABELS: Record<GarmentQuality, string> = {
  standard: "Standard cotton",
  premium: "Premium ringspun",
  heavy: "Heavyweight 220gsm",
};

export const PRINT_LABELS: Record<PrintMethod, string> = {
  dtf: "DTF print",
  screen: "Screen print",
};

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  card: "Card",
  bank_transfer: "Bank transfer",
  wallet: "Wallet",
};

export const STATUS_LABELS: Record<OrderStatus, string> = {
  draft: "Draft",
  quoted: "Quoted",
  order_received: "Order Received",
  design_confirmed: "Design Confirmed",
  production_assigned: "Production Assigned",
  printing: "Printing",
  quality_check: "Quality Check",
  packaging: "Packaging",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
  paid: "Order Received",
  in_production: "Printing",
};

/** Customer-facing tracking steps (excludes draft/quoted/cancel/refund). */
export const TRACKING_STATUSES: OrderStatus[] = [
  "order_received",
  "design_confirmed",
  "production_assigned",
  "printing",
  "quality_check",
  "packaging",
  "shipped",
  "delivered",
];

export const ADMIN_FULFILLMENT_STATUSES: OrderStatus[] = [
  "quoted",
  "order_received",
  "design_confirmed",
  "production_assigned",
  "printing",
  "quality_check",
  "packaging",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
];

export const NEXT_TRACKING_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  quoted: "order_received",
  order_received: "design_confirmed",
  design_confirmed: "production_assigned",
  production_assigned: "printing",
  printing: "quality_check",
  quality_check: "packaging",
  packaging: "shipped",
  shipped: "delivered",
  paid: "design_confirmed",
  in_production: "quality_check",
};

export function normalizeOrderStatus(status: OrderStatus): OrderStatus {
  if (status === "paid") return "order_received";
  if (status === "in_production") return "printing";
  return status;
}

/** API `OrderResponse` shape from `GET/POST/PATCH /orders`. */
export type OrderResponse = {
  id: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  line: OrderLine;
  subtotal: number;
  delivery: number;
  total: number;
  note?: string;
  checkout?: OrderCheckout;
  pricing?: OrderPricingSnapshot;
  statusHistory?: StatusEvent[];
};

export function mapOrderFromApi(response: OrderResponse): Order {
  const status = normalizeOrderStatus(response.status);
  const history =
    response.statusHistory && response.statusHistory.length > 0
      ? response.statusHistory.map((event) => ({
          ...event,
          status: normalizeOrderStatus(event.status),
        }))
      : [{ status, at: response.updatedAt ?? response.createdAt }];

  return {
    ...response,
    status,
    statusHistory: history,
  };
}

export const DESIGN_STATUS_LABELS: Record<DesignStatus, string> = {
  draft: "Draft",
  saved: "Design",
  ordered: "Ordered",
};
