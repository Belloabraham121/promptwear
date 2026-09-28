import { z } from 'zod';

/** Treat missing or blank env values as undefined for optional fields. */
const optionalNonEmpty = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().min(1).optional(),
);

const optionalUrl = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().url().optional(),
);

export const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.string().min(1),
  JWT_REFRESH_TTL: z.string().min(1),
  APP_URL: z.string().url(),
  // Local web origin when it differs from APP_URL (e.g. :3002 because :3000
  // is taken). Included in CORS + Better Auth trustedOrigins.
  CLIENT_URL: optionalUrl,
  PORT: z.coerce.number().int().positive().default(3001),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  S3_ENDPOINT: z.string().url(),
  /** Browser-reachable S3/MinIO URL for presigned uploads/downloads. Defaults to S3_ENDPOINT. */
  S3_PUBLIC_ENDPOINT: optionalUrl,
  S3_REGION: z.string().min(1),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_FORCE_PATH_STYLE: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  OPENAI_API_KEY: optionalNonEmpty,
  GOOGLE_CLIENT_ID: optionalNonEmpty,
  GOOGLE_CLIENT_SECRET: optionalNonEmpty,
  GOOGLE_CALLBACK_URL: optionalUrl,
  // ─── Better Auth (Phase 1 scaffold; required at Phase 3 cutover) ─────────
  // TODO(better-auth-phase-3): promote BETTER_AUTH_SECRET to required and
  // remove JWT_* once the legacy auth module is retired.
  BETTER_AUTH_SECRET: optionalNonEmpty,
  BETTER_AUTH_URL: optionalUrl,
  // ─── Email (Resend; unset = dev log-fallback in src/lib/email.ts) ─────────
  RESEND_API_KEY: optionalNonEmpty,
  EMAIL_FROM: optionalNonEmpty,
});

export type EnvSchema = z.infer<typeof envSchema>;
