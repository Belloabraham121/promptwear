import { Module } from '@nestjs/common';
import { AdminAnalyticsController } from './admin-analytics.controller';
import { AdminAnalyticsService } from './admin-analytics.service';
import { AnalyticsRollupService } from './analytics-rollup.service';

@Module({
  controllers: [AdminAnalyticsController],
  providers: [AdminAnalyticsService, AnalyticsRollupService],
  exports: [AdminAnalyticsService, AnalyticsRollupService],
})
export class AdminAnalyticsModule {}
