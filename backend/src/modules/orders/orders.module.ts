import { Module } from '@nestjs/common';
import { PricingModule } from '../../pricing/pricing.module';
import { OwnershipGuard } from '../../common/guards/ownership.guard';
import { CouponsModule } from '../coupons/coupons.module';
import { AdminOrdersController } from './admin-orders.controller';
import { IdempotencyService } from './idempotency.service';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [PricingModule, CouponsModule],
  controllers: [OrdersController, AdminOrdersController],
  providers: [OrdersService, IdempotencyService, OwnershipGuard],
  exports: [OrdersService],
})
export class OrdersModule {}
