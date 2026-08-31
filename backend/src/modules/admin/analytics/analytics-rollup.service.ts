import { Injectable } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { DailyRollup } from './analytics.types';
import {
  assertDateKey,
  dayBounds,
  eachDateKey,
  EXCLUDED_ORDER_STATUSES,
  parseOrderLine,
  totalQuantity,
} from './analytics.utils';

const CACHE_TTL_SECONDS = 60 * 60;
const CACHE_KEY_PREFIX = 'analytics:daily:';

@Injectable()
export class AnalyticsRollupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  cacheKey(dateKey: string): string {
    assertDateKey(dateKey);
    return `${CACHE_KEY_PREFIX}${dateKey}`;
  }

  private isValidDailyRollup(value: unknown): value is DailyRollup {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const record = value as Record<string, unknown>;

    if (
      typeof record.date !== 'string' ||
      typeof record.revenue !== 'number' ||
      typeof record.orderCount !== 'number' ||
      !Array.isArray(record.bestSelling)
    ) {
      return false;
    }

    return record.bestSelling.every((row) => {
      if (!row || typeof row !== 'object') {
        return false;
      }

      const item = row as Record<string, unknown>;
      return (
        typeof item.designId === 'string' &&
        typeof item.title === 'string' &&
        typeof item.units === 'number' &&
        typeof item.revenue === 'number'
      );
    });
  }

  async getDailyRollup(dateKey: string): Promise<DailyRollup> {
    assertDateKey(dateKey);
    await this.redisService.connect();
    const key = this.cacheKey(dateKey);
    const cached = await this.redisService.client.get(key);

    if (cached) {
      let parsed: unknown;

      try {
        parsed = JSON.parse(cached);
      } catch {
        await this.redisService.client.del(key);
        parsed = null;
      }

      if (parsed && this.isValidDailyRollup(parsed) && parsed.date === dateKey) {
        return parsed;
      }

      if (parsed !== null) {
        await this.redisService.client.del(key);
      }
    }

    const rollup = await this.computeDailyRollup(dateKey);
    await this.redisService.client.setex(
      this.cacheKey(dateKey),
      CACHE_TTL_SECONDS,
      JSON.stringify(rollup),
    );

    return rollup;
  }

  async computeDailyRollup(dateKey: string): Promise<DailyRollup> {
    const { start, end } = dayBounds(dateKey);

    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        status: { notIn: EXCLUDED_ORDER_STATUSES },
      },
      select: {
        total: true,
        line: true,
      },
    });

    const byDesign = new Map<
      string,
      { designId: string; title: string; units: number; revenue: number }
    >();

    let revenue = 0;

    for (const order of orders) {
      revenue += order.total;

      const line = parseOrderLine(order.line);
      if (!line) {
        continue;
      }

      const prev = byDesign.get(line.designId) ?? {
        designId: line.designId,
        title: line.designTitle,
        units: 0,
        revenue: 0,
      };
      prev.units += totalQuantity(line.sizes);
      prev.revenue += order.total;
      byDesign.set(line.designId, prev);
    }

    const bestSelling = [...byDesign.values()].sort((a, b) => b.units - a.units);

    return {
      date: dateKey,
      revenue,
      orderCount: orders.length,
      bestSelling,
    };
  }

  async invalidateDailyRollup(dateKey: string): Promise<void> {
    assertDateKey(dateKey);
    await this.redisService.connect();
    await this.redisService.client.del(this.cacheKey(dateKey));
  }

  async rollupDateRange(from: string, to: string): Promise<DailyRollup[]> {
    const dates = eachDateKey(from, to);
    return Promise.all(dates.map((dateKey) => this.getDailyRollup(dateKey)));
  }

  async countRepeatCustomers(since: Date): Promise<number> {
    const rows = await this.prisma.order.groupBy({
      by: ['userId'],
      where: {
        createdAt: { gte: since },
        status: {
          notIn: [
            ...EXCLUDED_ORDER_STATUSES,
            OrderStatus.draft,
            OrderStatus.quoted,
          ],
        },
      },
      _count: { _all: true },
    });

    return rows.filter((row) => row._count._all >= 2).length;
  }
}
