import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

const IDEMPOTENCY_TTL_SECONDS = 86_400;
const PROCESSING_TTL_SECONDS = 120;
const PROCESSING_MARKER = '__processing__';

export type IdempotencyGateResult<T> =
  | { status: 'cached'; value: T }
  | { status: 'processing_acquired' }
  | { status: 'in_progress' };

@Injectable()
export class IdempotencyService {
  private readonly memoryStore = new Map<
    string,
    { expiresAt: number; payload: string }
  >();

  constructor(private readonly redisService: RedisService) {}

  async beginOrGetCached<T>(key: string): Promise<IdempotencyGateResult<T>> {
    const cached = await this.getCached<T>(key);
    if (cached !== null) {
      return { status: 'cached', value: cached };
    }

    const redisKey = this.toRedisKey(key);
    const acquired = await this.redisService.client.set(
      redisKey,
      PROCESSING_MARKER,
      'EX',
      PROCESSING_TTL_SECONDS,
      'NX',
    );

    if (acquired === 'OK') {
      this.memoryStore.set(key, {
        expiresAt: Date.now() + PROCESSING_TTL_SECONDS * 1000,
        payload: PROCESSING_MARKER,
      });
      return { status: 'processing_acquired' };
    }

    const retry = await this.getCached<T>(key);
    if (retry !== null) {
      return { status: 'cached', value: retry };
    }

    return { status: 'in_progress' };
  }

  async getCached<T>(key: string): Promise<T | null> {
    const redisKey = this.toRedisKey(key);
    const cached = await this.redisService.client.get(redisKey);
    if (cached && cached !== PROCESSING_MARKER) {
      return JSON.parse(cached) as T;
    }

    const entry = this.memoryStore.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.memoryStore.delete(key);
      return null;
    }
    if (entry.payload === PROCESSING_MARKER) {
      return null;
    }
    return JSON.parse(entry.payload) as T;
  }

  async setCached<T>(key: string, value: T): Promise<void> {
    const payload = JSON.stringify(value);
    const redisKey = this.toRedisKey(key);
    await this.redisService.client.set(
      redisKey,
      payload,
      'EX',
      IDEMPOTENCY_TTL_SECONDS,
    );
    this.memoryStore.set(key, {
      expiresAt: Date.now() + IDEMPOTENCY_TTL_SECONDS * 1000,
      payload,
    });
  }

  async releaseProcessing(key: string): Promise<void> {
    const redisKey = this.toRedisKey(key);
    const current = await this.redisService.client.get(redisKey);
    if (current === PROCESSING_MARKER) {
      await this.redisService.client.del(redisKey);
    }

    const entry = this.memoryStore.get(key);
    if (entry?.payload === PROCESSING_MARKER) {
      this.memoryStore.delete(key);
    }
  }

  buildKey(userId: string, idempotencyKey: string): string {
    return `${userId}:${idempotencyKey}`;
  }

  private toRedisKey(key: string): string {
    return `idempotency:${key}`;
  }
}
