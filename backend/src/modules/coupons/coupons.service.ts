import { HttpStatus, Injectable } from '@nestjs/common';
import { Coupon, DiscountType } from '@prisma/client';
import { ErrorCodes } from '../../common/constants/error-codes';
import { AppException } from '../../common/exceptions/app.exception';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

const COUPON_LOCK_TTL_SECONDS = 10;

export type ValidatedCoupon = {
  id: string;
  code: string;
  type: DiscountType;
  value: number;
  maxRedemptions: number;
  redemptionCount: number;
  active: boolean;
  expiresAt: Date;
};

@Injectable()
export class CouponsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async validateCouponCode(
    code: string,
    options: { lock?: boolean; userId?: string } = {},
  ): Promise<ValidatedCoupon> {
    const normalized = code.trim().toUpperCase();
    if (!normalized) {
      throw new AppException(
        ErrorCodes.COUPON_INVALID,
        'Coupon code is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const lockKey = `coupon:lock:${normalized}`;
    let lockAcquired = false;

    if (options.lock) {
      const lockOwner = options.userId ?? 'anonymous';
      const result = await this.redisService.client.set(
        lockKey,
        lockOwner,
        'EX',
        COUPON_LOCK_TTL_SECONDS,
        'NX',
      );
      if (result !== 'OK') {
        throw new AppException(
          ErrorCodes.CONFLICT,
          'Coupon is being processed',
          HttpStatus.CONFLICT,
        );
      }
      lockAcquired = true;
    }

    try {
      return await this.assertCouponValid(normalized);
    } finally {
      if (lockAcquired) {
        await this.redisService.client.del(lockKey);
      }
    }
  }

  async redeemCoupon(params: {
    couponId: string;
    userId: string;
    orderId: string;
  }): Promise<void> {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id: params.couponId },
    });

    if (!coupon) {
      throw new AppException(
        ErrorCodes.COUPON_INVALID,
        'Coupon not found',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.validateCouponCode(coupon.code, {
      lock: true,
      userId: params.userId,
    });

    const updated = await this.prisma.coupon.updateMany({
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

    await this.prisma.couponRedemption.create({
      data: {
        couponId: params.couponId,
        orderId: params.orderId,
        userId: params.userId,
      },
    });
  }

  private async assertCouponValid(code: string): Promise<ValidatedCoupon> {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code },
    });

    if (!coupon) {
      throw new AppException(
        ErrorCodes.COUPON_INVALID,
        'Coupon not found',
        HttpStatus.BAD_REQUEST,
      );
    }

    this.ensureCouponUsable(coupon);
    return coupon;
  }

  private ensureCouponUsable(coupon: Coupon): void {
    if (!coupon.active) {
      throw new AppException(
        ErrorCodes.COUPON_INVALID,
        'Coupon is inactive',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (coupon.expiresAt <= new Date()) {
      throw new AppException(
        ErrorCodes.COUPON_EXPIRED,
        'Coupon has expired',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (coupon.redemptionCount >= coupon.maxRedemptions) {
      throw new AppException(
        ErrorCodes.COUPON_EXHAUSTED,
        'Coupon redemption limit reached',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
