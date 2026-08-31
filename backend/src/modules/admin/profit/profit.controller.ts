import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { Roles } from '../../../common/decorators/roles.decorator';
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
import { ProfitService } from './profit.service';

@Controller('admin/profit')
@Roles('admin')
export class ProfitController {
  constructor(private readonly profitService: ProfitService) {}

  @Get()
  getSettings() {
    return this.profitService.getSettings();
  }

  @Patch()
  updateSettings(@Body() dto: UpdateProfitSettingsDto) {
    return this.profitService.updateSettings(dto);
  }

  @Get('promotions')
  listPromotions() {
    return this.profitService.listPromotions();
  }

  @Post('promotions')
  createPromotion(@Body() dto: CreatePromotionDto) {
    return this.profitService.createPromotion(dto);
  }

  @Patch('promotions/:id')
  updatePromotion(@Param('id') id: string, @Body() dto: UpdatePromotionDto) {
    return this.profitService.updatePromotion(id, dto);
  }

  @Delete('promotions/:id')
  removePromotion(@Param('id') id: string) {
    return this.profitService.removePromotion(id);
  }

  @Get('discounts')
  listDiscounts() {
    return this.profitService.listDiscounts();
  }

  @Post('discounts')
  createDiscount(@Body() dto: CreateDiscountDto) {
    return this.profitService.createDiscount(dto);
  }

  @Patch('discounts/:id')
  updateDiscount(@Param('id') id: string, @Body() dto: UpdateDiscountDto) {
    return this.profitService.updateDiscount(id, dto);
  }

  @Delete('discounts/:id')
  removeDiscount(@Param('id') id: string) {
    return this.profitService.removeDiscount(id);
  }

  @Get('coupons')
  listCoupons() {
    return this.profitService.listCoupons();
  }

  @Post('coupons')
  createCoupon(@Body() dto: CreateCouponDto) {
    return this.profitService.createCoupon(dto);
  }

  @Patch('coupons/:id')
  updateCoupon(@Param('id') id: string, @Body() dto: UpdateCouponDto) {
    return this.profitService.updateCoupon(id, dto);
  }

  @Delete('coupons/:id')
  removeCoupon(@Param('id') id: string) {
    return this.profitService.removeCoupon(id);
  }
}
