import { Injectable } from '@nestjs/common';
import { PricingService } from '../../pricing/pricing.service';
import { PricedQuote } from '../../pricing/types';
import { CouponsService } from '../coupons/coupons.service';
import { CreateQuoteDto } from './dto/create-quote.dto';

@Injectable()
export class QuotesService {
  constructor(
    private readonly pricingService: PricingService,
    private readonly couponsService: CouponsService,
  ) {}

  async createQuote(dto: CreateQuoteDto): Promise<PricedQuote> {
    const sizes = this.pricingService.normalizeSizes(dto.sizes);
    const input = {
      quality: dto.quality,
      print: dto.print,
      sizes,
      deliveryCity: dto.deliveryCity,
      deliveryState: dto.deliveryState,
      rush: dto.rush,
    };

    if (!dto.couponCode?.trim()) {
      return this.pricingService.quote(input);
    }

    const coupon = await this.couponsService.validateCouponCode(
      dto.couponCode,
      { lock: false },
    );

    return this.pricingService.quoteWithCoupon(input, {
      couponId: coupon.id,
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
    });
  }
}
