import { envSchema } from './env.schema';

export default () => {
  const env = envSchema.parse(process.env);

  return {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    appUrl: env.APP_URL,
    // Every browser origin allowed to call this API (credentials included).
    allowedOrigins: [env.APP_URL, env.CLIENT_URL].filter(
      (origin, index, all): origin is string =>
        Boolean(origin) && all.indexOf(origin) === index,
    ),
    database: {
      url: env.DATABASE_URL,
    },
    redis: {
      url: env.REDIS_URL,
    },
    jwt: {
      secret: env.JWT_SECRET,
      accessTtl: env.JWT_ACCESS_TTL,
      refreshTtl: env.JWT_REFRESH_TTL,
    },
    // ─── Better Auth (Phase 1 scaffold) ────────────────────────────────────
    betterAuth: {
      // Falls back to APP_URL (OAuth callback construction) until explicitly set.
      url: env.BETTER_AUTH_URL ?? env.APP_URL,
      secret: env.BETTER_AUTH_SECRET,
    },
    // ─── Email (Resend; src/lib/email.ts reads process.env directly since it
    // runs outside Nest DI — mirrored here for completeness) ────────────────
    email: {
      resendApiKey: env.RESEND_API_KEY,
      from: env.EMAIL_FROM ?? 'Promptwear <noreply@promptwear.app>',
    },
    s3: {
      endpoint: env.S3_ENDPOINT,
      publicEndpoint: env.S3_PUBLIC_ENDPOINT ?? env.S3_ENDPOINT,
      region: env.S3_REGION,
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      bucket: env.S3_BUCKET,
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
    },
    openai: {
      apiKey: env.OPENAI_API_KEY,
    },
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      callbackUrl: env.GOOGLE_CALLBACK_URL,
    },
  };
};

export type AppConfig = ReturnType<typeof import('./configuration').default>;
