import { HttpStatus } from '@nestjs/common';
import { OrderStatus as PrismaOrderStatus } from '@prisma/client';
import { ErrorCodes } from '../../common/constants/error-codes';
import { AppException } from '../../common/exceptions/app.exception';
import {
  NEXT_TRACKING_STATUS,
  normalizeOrderStatus,
  OrderStatus,
} from './order.types';

export function assertTrackingTransition(
  current: PrismaOrderStatus,
  next: PrismaOrderStatus,
): void {
  const from = normalizeOrderStatus(current as OrderStatus);
  const to = normalizeOrderStatus(next as OrderStatus);

  if (from === to) {
    return;
  }

  const expected = NEXT_TRACKING_STATUS[from];
  if (expected !== to) {
    throw new AppException(
      ErrorCodes.ORDER_INVALID_TRANSITION,
      `Cannot transition from ${from} to ${to}`,
      HttpStatus.BAD_REQUEST,
      { from, to, expected },
    );
  }
}

export function assertCancellable(status: PrismaOrderStatus): void {
  const normalized = normalizeOrderStatus(status as OrderStatus);
  if (normalized === 'cancelled' || normalized === 'refunded') {
    throw new AppException(
      ErrorCodes.ORDER_INVALID_TRANSITION,
      'Order is already closed',
      HttpStatus.BAD_REQUEST,
    );
  }

  if (normalized === 'delivered') {
    throw new AppException(
      ErrorCodes.ORDER_INVALID_TRANSITION,
      'Delivered orders cannot be cancelled',
      HttpStatus.BAD_REQUEST,
    );
  }
}

export function assertRefundable(status: PrismaOrderStatus): void {
  const normalized = normalizeOrderStatus(status as OrderStatus);
  if (normalized === 'refunded') {
    throw new AppException(
      ErrorCodes.ORDER_INVALID_TRANSITION,
      'Order is already refunded',
      HttpStatus.BAD_REQUEST,
    );
  }

  if (normalized === 'cancelled') {
    throw new AppException(
      ErrorCodes.ORDER_INVALID_TRANSITION,
      'Cancelled orders must be handled separately',
      HttpStatus.BAD_REQUEST,
    );
  }
}
