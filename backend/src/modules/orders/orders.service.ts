import { HttpStatus, Injectable } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { ErrorCodes } from '../../common/constants/error-codes';
import { AppException } from '../../common/exceptions/app.exception';
import { PricingService } from '../../pricing/pricing.service';
import { PricedQuote } from '../../pricing/types';
import { CouponsService } from '../coupons/coupons.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  assertCancellable,
  assertRefundable,
  assertTrackingTransition,
} from './order-status.machine';
import { toOrderResponse } from './order.mapper';
import {
  OrderLine,
  OrderPricingSnapshot,
  OrderResponse,
  PaginatedOrdersResponse,
} from './order.types';
import { CreateOrderDto } from './dto/create-order.dto';
import { ListOrdersDto } from './dto/list-orders.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { IdempotencyService } from './idempotency.service';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricingService: PricingService,
    private readonly couponsService: CouponsService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  async list(
    userId: string,
    query: ListOrdersDto,
  ): Promise<PaginatedOrdersResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {
      userId,
      ...(query.status ? { status: query.status } : {}),
    };

    const [total, orders] = await this.prisma.$transaction([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          statusEvents: { orderBy: { at: 'asc' } },
        },
      }),
    ]);

    return {
      items: orders.map((order) =>
        toOrderResponse(order, order.statusEvents),
      ),
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    };
  }

  async listAll(query: ListOrdersDto): Promise<PaginatedOrdersResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = query.status
      ? { status: query.status }
      : {};

    const [total, orders] = await this.prisma.$transaction([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          statusEvents: { orderBy: { at: 'asc' } },
        },
      }),
    ]);

    return {
      items: orders.map((order) =>
        toOrderResponse(order, order.statusEvents),
      ),
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    };
  }

  async getById(userId: string, id: string): Promise<OrderResponse> {
    const order = await this.prisma.order.findFirst({
      where: { id, userId },
      include: {
        statusEvents: { orderBy: { at: 'asc' } },
      },
    });

    if (!order) {
      throw new AppException(
        ErrorCodes.NOT_FOUND,
        'Order not found',
        HttpStatus.NOT_FOUND,
      );
    }

    return toOrderResponse(order, order.statusEvents);
  }

  async getByIdAdmin(id: string): Promise<OrderResponse> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        statusEvents: { orderBy: { at: 'asc' } },
      },
    });

    if (!order) {
      throw new AppException(
        ErrorCodes.NOT_FOUND,
        'Order not found',
        HttpStatus.NOT_FOUND,
      );
    }

    return toOrderResponse(order, order.statusEvents);
  }

  async create(
    userId: string,
    dto: CreateOrderDto,
    idempotencyKey?: string,
  ): Promise<OrderResponse> {
    let cacheKey: string | undefined;
    let processingAcquired = false;

    if (idempotencyKey?.trim()) {
      cacheKey = this.idempotencyService.buildKey(
        userId,
        idempotencyKey.trim(),
      );
      const gate =
        await this.idempotencyService.beginOrGetCached<OrderResponse>(cacheKey);

      if (gate.status === 'cached') {
        return gate.value;
      }

      if (gate.status === 'in_progress') {
        throw new AppException(
          ErrorCodes.IDEMPOTENCY_CONFLICT,
          'Identical order request is already in progress',
          HttpStatus.CONFLICT,
        );
      }

      processingAcquired = true;
    }

    try {
      return await this.createOrder(userId, dto, cacheKey);
    } catch (error) {
      if (processingAcquired && cacheKey) {
        await this.idempotencyService.releaseProcessing(cacheKey);
      }
      throw error;
    }
  }

  private async createOrder(
    userId: string,
    dto: CreateOrderDto,
    cacheKey?: string,
  ): Promise<OrderResponse> {
    const design = await this.prisma.design.findFirst({
      where: { id: dto.designId, userId },
    });

    if (!design) {
      throw new AppException(
        ErrorCodes.NOT_FOUND,
        'Design not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const sizes = this.pricingService.normalizeSizes(dto.sizes);
    const qty = Object.values(sizes).reduce((sum, value) => sum + value, 0);
    if (qty <= 0) {
      throw new AppException(
        ErrorCodes.VALIDATION_ERROR,
        'At least one size quantity is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const quoteInput = {
      quality: dto.quality,
      print: dto.print,
      sizes,
      deliveryCity: dto.checkout.address.city,
      deliveryState: dto.checkout.address.state,
      rush: dto.rush,
    };

    let pricedQuote: PricedQuote;
    let couponId: string | undefined;

    if (dto.couponCode?.trim()) {
      const coupon = await this.couponsService.validateCouponCode(
        dto.couponCode,
        { lock: true, userId },
      );
      couponId = coupon.id;
      pricedQuote = await this.pricingService.quoteWithCoupon(quoteInput, {
        couponId: coupon.id,
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
      });
    } else {
      pricedQuote = await this.pricingService.quote(quoteInput);
    }

    if (!pricedQuote.vendor) {
      throw new AppException(
        ErrorCodes.NO_VENDOR_AVAILABLE,
        'No vendor available for this order',
        HttpStatus.BAD_REQUEST,
      );
    }

    const line: OrderLine = {
      designId: design.id,
      designTitle: design.title,
      color: design.color,
      quality: dto.quality,
      print: dto.print,
      sizes,
    };

    const pricing: OrderPricingSnapshot = {
      vendorId: pricedQuote.vendor.vendorId,
      vendorName: pricedQuote.vendor.vendorName,
      strategy: pricedQuote.strategy,
      fulfillmentCost: pricedQuote.fulfillmentCost,
      marginPct: pricedQuote.marginPct,
      marginAmount: pricedQuote.marginAmount,
      productionDays: pricedQuote.productionDays,
      deliveryDays: pricedQuote.deliveryDays,
      overridden: pricedQuote.overridden,
      ...(pricedQuote.coupon
        ? {
            couponCode: pricedQuote.coupon.code,
            discountAmount: pricedQuote.discountAmount,
          }
        : {}),
    };

    const status: OrderStatus = 'order_received';

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          userId,
          status,
          line: line as unknown as Prisma.InputJsonValue,
          subtotal: pricedQuote.subtotal,
          delivery: pricedQuote.delivery,
          total: pricedQuote.grandTotal,
          note: dto.note?.trim() || null,
          checkout: dto.checkout as unknown as Prisma.InputJsonValue,
          pricing: pricing as unknown as Prisma.InputJsonValue,
          vendorId: pricedQuote.vendor!.vendorId,
          statusEvents: {
            create: { status },
          },
        },
        include: {
          statusEvents: { orderBy: { at: 'asc' } },
        },
      });

      await tx.design.update({
        where: { id: design.id },
        data: { status: 'ordered' },
      });

      if (couponId) {
        await this.redeemCouponInTransaction(tx, {
          couponId,
          userId,
          orderId: created.id,
        });
      }

      return created;
    });

    const response = toOrderResponse(order, order.statusEvents);

    if (cacheKey) {
      await this.idempotencyService.setCached(cacheKey, response);
    }

    return response;
  }

  async updateNote(
    userId: string,
    id: string,
    dto: UpdateOrderDto,
  ): Promise<OrderResponse> {
    const existing = await this.prisma.order.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!existing) {
      throw new AppException(
        ErrorCodes.NOT_FOUND,
        'Order not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (dto.note === undefined) {
      return this.getById(userId, id);
    }

    const order = await this.prisma.order.update({
      where: { id, userId },
      data: { note: dto.note.trim() || null },
      include: {
        statusEvents: { orderBy: { at: 'asc' } },
      },
    });

    return toOrderResponse(order, order.statusEvents);
  }

  async updateStatus(
    orderId: string,
    nextStatus: OrderStatus,
  ): Promise<OrderResponse> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        statusEvents: { orderBy: { at: 'asc' } },
      },
    });

    if (!order) {
      throw new AppException(
        ErrorCodes.NOT_FOUND,
        'Order not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (nextStatus === 'cancelled') {
      assertCancellable(order.status);
    } else if (nextStatus === 'refunded') {
      assertRefundable(order.status);
    } else {
      assertTrackingTransition(order.status, nextStatus);
    }

    if (order.status === nextStatus) {
      return toOrderResponse(order, order.statusEvents);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.order.update({
        where: { id: orderId },
        data: { status: nextStatus },
        include: {
          statusEvents: { orderBy: { at: 'asc' } },
        },
      });

      await tx.orderStatusEvent.create({
        data: {
          orderId,
          status: nextStatus,
        },
      });

      const events = await tx.orderStatusEvent.findMany({
        where: { orderId },
        orderBy: { at: 'asc' },
      });

      return { saved, events };
    });

    return toOrderResponse(updated.saved, updated.events);
  }

  async cancel(orderId: string): Promise<OrderResponse> {
    return this.updateStatus(orderId, 'cancelled');
  }

  async refund(orderId: string): Promise<OrderResponse> {
    return this.updateStatus(orderId, 'refunded');
  }

  private async redeemCouponInTransaction(
    tx: Prisma.TransactionClient,
    params: { couponId: string; userId: string; orderId: string },
  ): Promise<void> {
    const coupon = await tx.coupon.findUnique({
      where: { id: params.couponId },
    });

    if (!coupon) {
      throw new AppException(
        ErrorCodes.COUPON_INVALID,
        'Coupon not found',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (
      !coupon.active ||
      coupon.expiresAt <= new Date() ||
      coupon.redemptionCount >= coupon.maxRedemptions
    ) {
      throw new AppException(
        ErrorCodes.COUPON_EXHAUSTED,
        'Coupon is no longer available',
        HttpStatus.CONFLICT,
      );
    }

    const updated = await tx.coupon.updateMany({
      where: {
        id: params.couponId,
        active: true,
        expiresAt: { gt: new Date() },
        redemptionCount: { lt: coupon.maxRedemptions },
      },
      data: {
        redemptionCount: { increment: 1 },
      },
    });

    if (updated.count === 0) {
      throw new AppException(
        ErrorCodes.COUPON_EXHAUSTED,
        'Coupon is no longer available',
        HttpStatus.CONFLICT,
      );
    }

    await tx.couponRedemption.create({
      data: {
        couponId: params.couponId,
        orderId: params.orderId,
        userId: params.userId,
      },
    });
  }
}
