import { Controller, Get, Query } from '@nestjs/common';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AdminAnalyticsService } from './admin-analytics.service';
import { RevenueQueryDto } from './dto/revenue-query.dto';

@Controller('admin/analytics')
@Roles('admin')
export class AdminAnalyticsController {
  constructor(private readonly analyticsService: AdminAnalyticsService) {}

  @Get()
  getSnapshot() {
    return this.analyticsService.getSnapshot();
  }

  @Get('revenue')
  getRevenue(@Query() query: RevenueQueryDto) {
    return this.analyticsService.getRevenueSeries(query.from, query.to);
  }

  @Get('bestsellers')
  getBestsellers() {
    return this.analyticsService.getBestsellers();
  }
}
