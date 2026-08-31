import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';

function setTestEnv(): void {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL ??=
    'postgresql://promptwear:promptwear@localhost:5433/promptwear';
  process.env.REDIS_URL ??= 'redis://localhost:6379';
  process.env.JWT_SECRET ??=
    'test-jwt-secret-at-least-32-characters-long';
  process.env.JWT_ACCESS_TTL ??= '15m';
  process.env.JWT_REFRESH_TTL ??= '7d';
  process.env.APP_URL ??= 'http://localhost:3000';
  process.env.PORT ??= '3001';
  process.env.S3_ENDPOINT ??= 'http://localhost:9000';
  process.env.S3_REGION ??= 'us-east-1';
  process.env.S3_ACCESS_KEY_ID ??= 'minioadmin';
  process.env.S3_SECRET_ACCESS_KEY ??= 'minioadmin';
  process.env.S3_BUCKET ??= 'promptwear-assets';
  process.env.S3_FORCE_PATH_STYLE ??= 'true';
}

function parseSetCookie(setCookie: string[] | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  for (const header of setCookie ?? []) {
    const [pair] = header.split(';');
    const eq = pair.indexOf('=');
    if (eq > 0) {
      cookies[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim();
    }
  }
  return cookies;
}

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const testEmail = `auth-e2e-${Date.now()}@example.com`;
  const testPassword = 'test-password-123';
  const testName = 'E2E Test User';

  beforeAll(async () => {
    setTestEnv();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get(PrismaService);
    app.setGlobalPrefix('api/v1');
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: testEmail } });
    await app.close();
  });

  it('register -> cookies set -> session -> logout', async () => {
    const agent = request.agent(app.getHttpServer());

    const registerResponse = await agent
      .post('/api/v1/auth/register')
      .send({
        email: testEmail,
        password: testPassword,
        name: testName,
      })
      .expect(201);

    expect(registerResponse.body.data).toMatchObject({
      email: testEmail,
      name: testName,
      role: 'customer',
      guest: false,
    });

    const setCookieHeader = registerResponse.headers['set-cookie'];
    const registerCookies = parseSetCookie(
      Array.isArray(setCookieHeader)
        ? setCookieHeader
        : setCookieHeader
          ? [setCookieHeader]
          : undefined,
    );
    expect(registerCookies.access_token).toBeDefined();
    expect(registerCookies.refresh_token).toBeDefined();

    const sessionResponse = await agent.get('/api/v1/auth/session').expect(200);

    expect(sessionResponse.body.data).toMatchObject({
      email: testEmail,
      name: testName,
    });

    const csrfResponse = await agent.get('/api/v1/auth/csrf').expect(200);
    const csrfToken = csrfResponse.body.data.token as string;
    expect(csrfToken).toBeTruthy();

    await agent
      .post('/api/v1/auth/logout')
      .set('X-CSRF-Token', csrfToken)
      .expect(200);

    await agent.get('/api/v1/auth/session').expect(401);
  });
});
