import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AnalyticsRollupService } from './analytics-rollup.service';
import {
  AnalyticsSnapshot,
  BestSellingRow,
  RevenueSeriesPoint,
} from './analytics.types';
import {
  EXCLUDED_ORDER_STATUSES,
  formatNaira,
  parseOrderLine,
  totalQuantity,
} from './analytics.utils';

const REPEAT_WINDOW_DAYS = 90;

@Injectable()
export class AdminAnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rollupService: AnalyticsRollupService,
  ) {}

  async getSnapshot(): Promise<AnalyticsSnapshot> {
    const [orders, designCount, vendors, repeatCount, userCount, customerCount] =
      await Promise.all([
        this.prisma.order.findMany({
          where: { status: { notIn: EXCLUDED_ORDER_STATUSES } },
          select: { total: true, line: true },
        }),
        this.prisma.design.count(),
        this.prisma.vendor.findMany({
          orderBy: { name: 'asc' },
          select: {
            id: true,
            name: true,
            qualityRating: true,
            onTimeRate: true,
            capacityPerWeek: true,
            priceIndex: true,
            active: true,
          },
        }),
        this.rollupService.countRepeatCustomers(
          new Date(Date.now() - REPEAT_WINDOW_DAYS * 86_400_000),
        ),
        this.prisma.user.count(),
        this.prisma.user.count({ where: { role: 'customer' } }),
      ]);

    const revenue = orders.reduce((sum, order) => sum + order.total, 0);
    const orderCount = orders.length;
    const conversionRate =
      designCount > 0
        ? Math.min(1, orderCount / designCount)
        : orderCount > 0
          ? 1
          : 0;

    const byDesign = new Map<string, BestSellingRow>();

    for (const order of orders) {
      const line = parseOrderLine(order.line);
      if (!line) {
        continue;
      }

      const prev = byDesign.get(line.designId) ?? {
        title: line.designTitle,
        units: 0,
        revenue: 0,
      };
      prev.units += totalQuantity(line.sizes);
      prev.revenue += order.total;
      byDesign.set(line.designId, prev);
    }

    const bestSelling = [...byDesign.values()]
      .sort((a, b) => b.units - a.units)
      .slice(0, 8);

    return {
      revenue,
      revenueLabel: formatNaira(revenue),
      orderCount,
      conversionRate,
      conversionLabel: `${Math.round(conversionRate * 100)}%`,
      userCount,
      customerCount,
      activeVendorCount: vendors.filter((vendor) => vendor.active).length,
      vendorCount: vendors.length,
      bestSelling,
      repeatCustomers: {
        label: 'Repeat buyers',
        count: repeatCount,
        hint: `Customers with 2+ paid orders in ${REPEAT_WINDOW_DAYS} days`,
      },
      vendorPerformance: vendors.map((vendor) => ({
        id: vendor.id,
        name: vendor.name,
        qualityRating: vendor.qualityRating,
        onTimeRate: vendor.onTimeRate,
        capacityPerWeek: vendor.capacityPerWeek,
        priceIndex: vendor.priceIndex,
        active: vendor.active,
      })),
    };
  }

  async getRevenueSeries(from: string, to: string): Promise<RevenueSeriesPoint[]> {
    const rollups = await this.rollupService.rollupDateRange(from, to);

    return rollups.map((rollup) => ({
      date: rollup.date,
      revenue: rollup.revenue,
      orderCount: rollup.orderCount,
    }));
  }

  async getBestsellers(limit = 5): Promise<BestSellingRow[]> {
    const orders = await this.prisma.order.findMany({
      where: { status: { notIn: EXCLUDED_ORDER_STATUSES } },
      select: { total: true, line: true },
    });

    const byDesign = new Map<string, BestSellingRow>();

    for (const order of orders) {
      const line = parseOrderLine(order.line);
      if (!line) {
        continue;
      }

      const prev = byDesign.get(line.designId) ?? {
        title: line.designTitle,
        units: 0,
        revenue: 0,
      };
      prev.units += totalQuantity(line.sizes);
      prev.revenue += order.total;
      byDesign.set(line.designId, prev);
    }

    return [...byDesign.values()]
      .sort((a, b) => b.units - a.units)
      .slice(0, limit);
  }
}
