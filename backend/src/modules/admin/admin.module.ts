import { Module } from '@nestjs/common';
import { AdminAnalyticsModule } from './analytics/analytics.module';
import { CatalogModule } from './catalog/catalog.module';
import { ProfitModule } from './profit/profit.module';
import { VendorsModule } from './vendors/vendors.module';

@Module({
  imports: [CatalogModule, VendorsModule, ProfitModule, AdminAnalyticsModule],
})
export class AdminModule {}
