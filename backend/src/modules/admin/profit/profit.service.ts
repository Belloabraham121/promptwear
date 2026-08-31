import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ErrorCodes } from '../../../common/constants/error-codes';
import { AppException } from '../../../common/exceptions/app.exception';
import { PrismaService } from '../../prisma/prisma.service';
import {
  toCouponResponse,
  toDiscountResponse,
  toProfitSettingsResponse,
  toPromotionResponse,
} from '../admin.mapper';
import {
  CouponResponse,
  DiscountResponse,
  PromotionResponse,
  ProfitSettingsResponse,
} from '../admin.types';
import {
  CreateCouponDto,
  UpdateCouponDto,
} from './dto/coupon.dto';
import {
  CreateDiscountDto,
  UpdateDiscountDto,
} from './dto/discount.dto';
import {
  CreatePromotionDto,
  UpdatePromotionDto,
} from './dto/promotion.dto';
import { UpdateProfitSettingsDto } from './dto/update-profit-settings.dto';

const PROFIT_SETTINGS_ID = 'default';

@Injectable()
export class ProfitService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings(): Promise<ProfitSettingsResponse> {
    const settings = await this.findSettingsOrThrow();
    return toProfitSettingsResponse(settings);
  }

  async updateSettings(
    dto: UpdateProfitSettingsDto,
  ): Promise<ProfitSettingsResponse> {
    await this.findSettingsOrThrow();

    if (dto.overrideVendorId) {
      await this.assertVendorExists(dto.overrideVendorId);
    }

    if (dto.excludedVendorIds?.length) {
      for (const vendorId of dto.excludedVendorIds) {
        await this.assertVendorExists(vendorId);
      }
    }

    const data: Prisma.ProfitSettingsUpdateInput = {};

    if (dto.defaultMarginPct !== undefined) {
      data.defaultMarginPct = dto.defaultMarginPct;
    }
    if (dto.rushMarginPct !== undefined) data.rushMarginPct = dto.rushMarginPct;
    if (dto.minMarginPct !== undefined) data.minMarginPct = dto.minMarginPct;
    if (dto.maxMarginPct !== undefined) data.maxMarginPct = dto.maxMarginPct;
    if (dto.selectionStrategy !== undefined) {
      data.selectionStrategy = dto.selectionStrategy;
    }
    if (dto.excludedVendorIds !== undefined) {
      data.excludedVendorIds = dto.excludedVendorIds;
    }
    if (dto.overrideVendorId !== undefined) {
      data.overrideVendor =
        dto.overrideVendorId === null
          ? { disconnect: true }
          : { connect: { id: dto.overrideVendorId } };
    }

    const settings = await this.prisma.profitSettings.update({
      where: { id: PROFIT_SETTINGS_ID },
      data,
      include: this.settingsInclude(),
    });

    return toProfitSettingsResponse(settings);
  }

  async listPromotions(): Promise<PromotionResponse[]> {
    const promotions = await this.prisma.promotion.findMany({
      where: { profitSettingsId: PROFIT_SETTINGS_ID },
      orderBy: { startsAt: 'desc' },
    });

    return promotions.map(toPromotionResponse);
  }

  async createPromotion(dto: CreatePromotionDto): Promise<PromotionResponse> {
    await this.ensureSettingsExist();

    const promotion = await this.prisma.promotion.create({
      data: {
        profitSettingsId: PROFIT_SETTINGS_ID,
        name: dto.name.trim(),
        description: dto.description?.trim() ?? '',
        active: dto.active ?? true,
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
      },
    });

    return toPromotionResponse(promotion);
  }

  async updatePromotion(
    id: string,
    dto: UpdatePromotionDto,
  ): Promise<PromotionResponse> {
    await this.findPromotionOrThrow(id);

    const promotion = await this.prisma.promotion.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description.trim() }
          : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
        ...(dto.startsAt !== undefined
          ? { startsAt: new Date(dto.startsAt) }
          : {}),
        ...(dto.endsAt !== undefined ? { endsAt: new Date(dto.endsAt) } : {}),
      },
    });

    return toPromotionResponse(promotion);
  }

  async removePromotion(id: string): Promise<{ id: string }> {
    await this.findPromotionOrThrow(id);
    await this.prisma.promotion.delete({ where: { id } });
    return { id };
  }

  async listDiscounts(): Promise<DiscountResponse[]> {
    const discounts = await this.prisma.discount.findMany({
      where: { profitSettingsId: PROFIT_SETTINGS_ID },
      orderBy: { minQty: 'asc' },
    });

    return discounts.map(toDiscountResponse);
  }

  async createDiscount(dto: CreateDiscountDto): Promise<DiscountResponse> {
    await this.ensureSettingsExist();

    const discount = await this.prisma.discount.create({
      data: {
        profitSettingsId: PROFIT_SETTINGS_ID,
        name: dto.name.trim(),
        type: dto.type,
        value: dto.value,
        minQty: dto.minQty,
        active: dto.active ?? true,
      },
    });

    return toDiscountResponse(discount);
  }

  async updateDiscount(
    id: string,
    dto: UpdateDiscountDto,
  ): Promise<DiscountResponse> {
    await this.findDiscountOrThrow(id);

    const discount = await this.prisma.discount.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.value !== undefined ? { value: dto.value } : {}),
        ...(dto.minQty !== undefined ? { minQty: dto.minQty } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
    });

    return toDiscountResponse(discount);
  }

  async removeDiscount(id: string): Promise<{ id: string }> {
    await this.findDiscountOrThrow(id);
    await this.prisma.discount.delete({ where: { id } });
    return { id };
  }

  async listCoupons(): Promise<CouponResponse[]> {
    const coupons = await this.prisma.coupon.findMany({
      where: { profitSettingsId: PROFIT_SETTINGS_ID },
      orderBy: { code: 'asc' },
    });

    return coupons.map(toCouponResponse);
  }

  async createCoupon(dto: CreateCouponDto): Promise<CouponResponse> {
    await this.ensureSettingsExist();

    const existing = await this.prisma.coupon.findUnique({
      where: { code: dto.code.toUpperCase() },
    });

    if (existing) {
      throw new AppException(
        ErrorCodes.CONFLICT,
        'Coupon code already exists',
        HttpStatus.CONFLICT,
      );
    }

    const coupon = await this.prisma.coupon.create({
      data: {
        profitSettingsId: PROFIT_SETTINGS_ID,
        code: dto.code.trim().toUpperCase(),
        type: dto.type,
        value: dto.value,
        maxRedemptions: dto.maxRedemptions,
        active: dto.active ?? true,
        expiresAt: new Date(dto.expiresAt),
      },
    });

    return toCouponResponse(coupon);
  }

  async updateCoupon(id: string, dto: UpdateCouponDto): Promise<CouponResponse> {
    await this.findCouponOrThrow(id);

    if (dto.code) {
      const existing = await this.prisma.coupon.findFirst({
        where: {
          code: dto.code.toUpperCase(),
          NOT: { id },
        },
      });

      if (existing) {
        throw new AppException(
          ErrorCodes.CONFLICT,
          'Coupon code already exists',
          HttpStatus.CONFLICT,
        );
      }
    }

    const coupon = await this.prisma.coupon.update({
      where: { id },
      data: {
        ...(dto.code !== undefined
          ? { code: dto.code.trim().toUpperCase() }
          : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.value !== undefined ? { value: dto.value } : {}),
        ...(dto.maxRedemptions !== undefined
          ? { maxRedemptions: dto.maxRedemptions }
          : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
        ...(dto.expiresAt !== undefined
          ? { expiresAt: new Date(dto.expiresAt) }
          : {}),
      },
    });

    return toCouponResponse(coupon);
  }

  async removeCoupon(id: string): Promise<{ id: string }> {
    await this.findCouponOrThrow(id);
    await this.prisma.coupon.delete({ where: { id } });
    return { id };
  }

  private settingsInclude() {
    return {
      promotions: { orderBy: { startsAt: 'desc' as const } },
      discounts: { orderBy: { minQty: 'asc' as const } },
      coupons: { orderBy: { code: 'asc' as const } },
    };
  }

  private async findSettingsOrThrow() {
    const settings = await this.prisma.profitSettings.findUnique({
      where: { id: PROFIT_SETTINGS_ID },
      include: this.settingsInclude(),
    });

    if (!settings) {
      throw new AppException(
        ErrorCodes.NOT_FOUND,
        'Profit settings not found',
        HttpStatus.NOT_FOUND,
      );
    }

    return settings;
  }

  private async ensureSettingsExist(): Promise<void> {
    await this.findSettingsOrThrow();
  }

  private async assertVendorExists(id: string): Promise<void> {
    const vendor = await this.prisma.vendor.findUnique({ where: { id } });
    if (!vendor) {
      throw new AppException(
        ErrorCodes.NOT_FOUND,
        'Vendor not found',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  private async findPromotionOrThrow(id: string) {
    const promotion = await this.prisma.promotion.findFirst({
      where: { id, profitSettingsId: PROFIT_SETTINGS_ID },
    });

    if (!promotion) {
      throw new AppException(
        ErrorCodes.NOT_FOUND,
        'Promotion not found',
        HttpStatus.NOT_FOUND,
      );
    }

    return promotion;
  }

  private async findDiscountOrThrow(id: string) {
    const discount = await this.prisma.discount.findFirst({
      where: { id, profitSettingsId: PROFIT_SETTINGS_ID },
    });

    if (!discount) {
      throw new AppException(
        ErrorCodes.NOT_FOUND,
        'Discount not found',
        HttpStatus.NOT_FOUND,
      );
    }

    return discount;
  }

  private async findCouponOrThrow(id: string) {
    const coupon = await this.prisma.coupon.findFirst({
      where: { id, profitSettingsId: PROFIT_SETTINGS_ID },
    });

    if (!coupon) {
      throw new AppException(
        ErrorCodes.NOT_FOUND,
        'Coupon not found',
        HttpStatus.NOT_FOUND,
      );
    }

    return coupon;
  }
}
