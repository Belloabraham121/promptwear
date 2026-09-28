import { PrismaClient } from '@prisma/client';

/**
 * Standalone PrismaClient for Better Auth (Phase 1 scaffold).
 *
 * Why not PrismaService? Better Auth needs a client instance at module load,
 * outside Nest's DI graph. During dual-run the legacy auth path keeps using
 * PrismaService; at cutover (migration Phase 3) this singleton is replaced by
 * the Nest-managed PrismaService instance.
 */
const globalForPrisma = globalThis as unknown as {
  __betterAuthPrisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.__betterAuthPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__betterAuthPrisma = prisma;
}
