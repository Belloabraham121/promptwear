import {
  GarmentQuality,
  PrintMethod,
  SizeBreakdown,
} from '../../pricing/types';

export type OrderStatus =
  | 'draft'
  | 'quoted'
  | 'order_received'
  | 'design_confirmed'
  | 'production_assigned'
  | 'printing'
  | 'quality_check'
  | 'packaging'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded'
  | 'paid'
  | 'in_production';

export type OrderLine = {
  designId: string;
  designTitle: string;
  color: string;
  quality: GarmentQuality;
  print: PrintMethod;
  sizes: SizeBreakdown;
};

export type PaymentMethod = 'card' | 'bank_transfer' | 'wallet';

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

export type PaginatedOrdersResponse = {
  items: OrderResponse[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export const TRACKING_STATUSES: OrderStatus[] = [
  'order_received',
  'design_confirmed',
  'production_assigned',
  'printing',
  'quality_check',
  'packaging',
  'shipped',
  'delivered',
];

export const NEXT_TRACKING_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  quoted: 'order_received',
  order_received: 'design_confirmed',
  design_confirmed: 'production_assigned',
  production_assigned: 'printing',
  printing: 'quality_check',
  quality_check: 'packaging',
  packaging: 'shipped',
  shipped: 'delivered',
  paid: 'design_confirmed',
  in_production: 'quality_check',
};

export function normalizeOrderStatus(status: OrderStatus): OrderStatus {
  if (status === 'paid') return 'order_received';
  if (status === 'in_production') return 'printing';
  return status;
}
