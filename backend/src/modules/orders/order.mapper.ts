import { Order, OrderStatusEvent, Prisma } from '@prisma/client';
import {
  OrderCheckout,
  OrderLine,
  OrderPricingSnapshot,
  OrderResponse,
  OrderStatus,
  StatusEvent,
  normalizeOrderStatus,
} from './order.types';

function parseJsonObject<T>(value: Prisma.JsonValue): T | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  return value as T;
}

function parseStatusHistory(events: OrderStatusEvent[]): StatusEvent[] {
  return events.map((event) => ({
    status: normalizeOrderStatus(event.status as OrderStatus),
    at: event.at.toISOString(),
  }));
}

export function toOrderResponse(
  order: Order,
  statusEvents: OrderStatusEvent[] = [],
): OrderResponse {
  const line = parseJsonObject<OrderLine>(order.line);
  if (!line) {
    throw new Error(`Order ${order.id} has invalid line snapshot`);
  }

  return {
    id: order.id,
    status: normalizeOrderStatus(order.status as OrderStatus),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    line,
    subtotal: order.subtotal,
    delivery: order.delivery,
    total: order.total,
    note: order.note ?? undefined,
    checkout: parseJsonObject<OrderCheckout>(order.checkout),
    pricing: parseJsonObject<OrderPricingSnapshot>(order.pricing),
    statusHistory: parseStatusHistory(statusEvents),
  };
}
