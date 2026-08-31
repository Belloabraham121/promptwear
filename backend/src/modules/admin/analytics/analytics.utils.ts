import { HttpStatus } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { ErrorCodes } from '../../../common/constants/error-codes';
import { AppException } from '../../../common/exceptions/app.exception';
import { OrderLineSnapshot } from './analytics.types';

export const MAX_REVENUE_RANGE_DAYS = 366;
export const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const EXCLUDED_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.cancelled,
  OrderStatus.refunded,
];

export const COUNTABLE_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.order_received,
  OrderStatus.design_confirmed,
  OrderStatus.production_assigned,
  OrderStatus.printing,
  OrderStatus.quality_check,
  OrderStatus.packaging,
  OrderStatus.shipped,
  OrderStatus.delivered,
  OrderStatus.paid,
  OrderStatus.in_production,
];

export function formatNaira(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function totalQuantity(sizes: Record<string, number>): number {
  return Object.values(sizes).reduce((sum, qty) => sum + (qty ?? 0), 0);
}

export function parseOrderLine(line: unknown): OrderLineSnapshot | null {
  if (!line || typeof line !== 'object') {
    return null;
  }

  const record = line as Record<string, unknown>;
  const designId = record.designId;
  const designTitle = record.designTitle;
  const sizes = record.sizes;

  if (typeof designId !== 'string' || typeof designTitle !== 'string') {
    return null;
  }

  if (!sizes || typeof sizes !== 'object') {
    return null;
  }

  return {
    designId,
    designTitle,
    sizes: sizes as Record<string, number>,
  };
}

export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function dayBounds(dateKey: string): { start: Date; end: Date } {
  const start = new Date(`${dateKey}T00:00:00.000Z`);
  const end = new Date(`${dateKey}T23:59:59.999Z`);
  return { start, end };
}

export function assertDateKey(dateKey: string): void {
  if (!DATE_KEY_PATTERN.test(dateKey)) {
    throw new AppException(
      ErrorCodes.VALIDATION_ERROR,
      'Invalid analytics date key',
      HttpStatus.BAD_REQUEST,
    );
  }
}

export function eachDateKey(from: string, to: string): string[] {
  assertDateKey(from);
  assertDateKey(to);

  const start = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T00:00:00.000Z`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new AppException(
      ErrorCodes.VALIDATION_ERROR,
      'Invalid revenue date range',
      HttpStatus.BAD_REQUEST,
    );
  }

  if (start > end) {
    throw new AppException(
      ErrorCodes.VALIDATION_ERROR,
      'Revenue range start must be on or before end',
      HttpStatus.BAD_REQUEST,
    );
  }

  const keys: string[] = [];
  const current = new Date(start);

  while (current <= end) {
    keys.push(toDateKey(current));

    if (keys.length > MAX_REVENUE_RANGE_DAYS) {
      throw new AppException(
        ErrorCodes.VALIDATION_ERROR,
        `Revenue range cannot exceed ${MAX_REVENUE_RANGE_DAYS} days`,
        HttpStatus.BAD_REQUEST,
      );
    }

    current.setUTCDate(current.getUTCDate() + 1);
  }

  return keys;
}
