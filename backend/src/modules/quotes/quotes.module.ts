import { Module } from '@nestjs/common';
import { PricingModule } from '../../pricing/pricing.module';
import { CouponsModule } from '../coupons/coupons.module';
import { QuotesController } from './quotes.controller';
import { QuotesService } from './quotes.service';

@Module({
  imports: [PricingModule, CouponsModule],
  controllers: [QuotesController],
  providers: [QuotesService],
  exports: [QuotesService],
})
export class QuotesModule {}
