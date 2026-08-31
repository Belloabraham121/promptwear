import { createHash } from 'crypto';
import { Injectable } from '@nestjs/common';
import { Vendor as PrismaVendor } from '@prisma/client';
import { PrismaService } from '../modules/prisma/prisma.service';
import { RedisService } from '../modules/redis/redis.service';
import { runSmartPricing } from './engine';
import {
  PricedQuote,
  PricingInput,
  ProfitSettings,
  SizeBreakdown,
  Vendor,
  VendorMaterialQuality,
  VendorPrintMethod,
} from './types';

const QUOTE_CACHE_TTL_SECONDS = 300;

@Injectable()
export class PricingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async quote(input: PricingInput): Promise<PricedQuote> {
    const cacheKey = this.buildCacheKey(input);
    const cached = await this.redisService.client.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as PricedQuote;
    }

    const [vendors, profit] = await Promise.all([
      this.loadVendors(),
      this.loadProfitSettings(),
    ]);

    const smartQuote = runSmartPricing(input, vendors, profit);
    const priced: PricedQuote = {
      ...smartQuote,
      discountAmount: 0,
      grandTotal: smartQuote.total,
    };

    await this.redisService.client.set(
      cacheKey,
      JSON.stringify(priced),
      'EX',
      QUOTE_CACHE_TTL_SECONDS,
    );

    return priced;
  }

  async quoteWithCoupon(
    input: PricingInput,
    coupon?: {
      couponId: string;
      code: string;
      type: 'percent' | 'flat';
      value: number;
    },
  ): Promise<PricedQuote> {
    const cacheKey = this.buildCacheKey(input, coupon?.code);
    const cached = await this.redisService.client.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as PricedQuote;
    }

    const base = await this.quote(input);
    const priced = coupon
      ? this.applyCoupon(base, coupon)
      : { ...base, discountAmount: 0, grandTotal: base.total };

    await this.redisService.client.set(
      cacheKey,
      JSON.stringify(priced),
      'EX',
      QUOTE_CACHE_TTL_SECONDS,
    );

    return priced;
  }

  applyCoupon(
    quote: PricedQuote,
    coupon: {
      couponId: string;
      code: string;
      type: 'percent' | 'flat';
      value: number;
    },
  ): PricedQuote {
    const discountAmount = this.computeDiscount(quote.total, coupon);
    return {
      ...quote,
      coupon: {
        couponId: coupon.couponId,
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        discountAmount,
      },
      discountAmount,
      grandTotal: Math.max(0, quote.total - discountAmount),
    };
  }

  computeDiscount(
    total: number,
    coupon: { type: 'percent' | 'flat'; value: number },
  ): number {
    if (total <= 0) return 0;
    if (coupon.type === 'percent') {
      return Math.round(total * (coupon.value / 100));
    }
    return Math.min(total, Math.round(coupon.value));
  }

  private buildCacheKey(input: PricingInput, couponCode?: string): string {
    const payload = JSON.stringify({ ...input, couponCode: couponCode ?? null });
    const hash = createHash('sha256').update(payload).digest('hex');
    return `quote:${hash}`;
  }

  private async loadVendors(): Promise<Vendor[]> {
    const rows = await this.prisma.vendor.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });
    return rows.map((row) => this.toVendor(row));
  }

  private async loadProfitSettings(): Promise<ProfitSettings> {
    const row = await this.prisma.profitSettings.findUnique({
      where: { id: 'default' },
    });

    if (!row) {
      return {
        defaultMarginPct: 28,
        rushMarginPct: 38,
        minMarginPct: 15,
        maxMarginPct: 45,
        selectionStrategy: 'lowest_cost',
        excludedVendorIds: [],
        overrideVendorId: null,
      };
    }

    return {
      defaultMarginPct: row.defaultMarginPct,
      rushMarginPct: row.rushMarginPct,
      minMarginPct: row.minMarginPct,
      maxMarginPct: row.maxMarginPct,
      selectionStrategy: row.selectionStrategy,
      excludedVendorIds: this.parseStringArray(row.excludedVendorIds),
      overrideVendorId: row.overrideVendorId,
    };
  }

  private toVendor(row: PrismaVendor): Vendor {
    return {
      id: row.id,
      name: row.name,
      location: row.location,
      qualityRating: row.qualityRating,
      customerRating: row.customerRating,
      capacityPerWeek: row.capacityPerWeek,
      priceIndex: row.priceIndex,
      onTimeRate: row.onTimeRate,
      active: row.active,
      excluded: row.excluded,
      notes: row.notes ?? undefined,
      garmentCostByQuality: row.garmentCostByQuality as Record<
        VendorMaterialQuality,
        number
      >,
      printingCostByMethod: row.printingCostByMethod as Record<
        VendorPrintMethod,
        number
      >,
      materialAvailable: row.materialAvailable as VendorMaterialQuality[],
      printMethods: row.printMethods as VendorPrintMethod[],
      deliveryRegions: this.parseStringArray(row.deliveryRegions),
      shippingCostBase: row.shippingCostBase,
      shippingCostPerUnit: row.shippingCostPerUnit,
      estimatedProductionDays: row.estimatedProductionDays,
      deliverySlaDays: row.deliverySlaDays,
    };
  }

  private parseStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.filter((entry): entry is string => typeof entry === 'string');
  }

  normalizeSizes(sizes: Partial<SizeBreakdown>): SizeBreakdown {
    return {
      S: sizes.S ?? 0,
      M: sizes.M ?? 0,
      L: sizes.L ?? 0,
      XL: sizes.XL ?? 0,
      XXL: sizes.XXL ?? 0,
    };
  }
}
