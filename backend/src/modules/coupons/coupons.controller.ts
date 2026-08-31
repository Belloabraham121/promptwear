import { Body, Controller, Post } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { PricingService } from '../../pricing/pricing.service';
import { ValidateCouponDto } from './dto/validate-coupon.dto';
import { CouponsService } from './coupons.service';

@Controller('coupons')
export class CouponsController {
  constructor(
    private readonly couponsService: CouponsService,
    private readonly pricingService: PricingService,
  ) {}

  @Public()
  @Post('validate')
  async validate(@Body() dto: ValidateCouponDto) {
    const coupon = await this.couponsService.validateCouponCode(dto.code, {
      lock: false,
    });

    const orderTotal = dto.orderTotal ? Number(dto.orderTotal) : 0;
    const discountAmount =
      orderTotal > 0
        ? this.pricingService.computeDiscount(orderTotal, coupon)
        : 0;

    return {
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        expiresAt: coupon.expiresAt.toISOString(),
      },
      discountAmount,
      finalTotal: orderTotal > 0 ? Math.max(0, orderTotal - discountAmount) : 0,
    };
  }
}
