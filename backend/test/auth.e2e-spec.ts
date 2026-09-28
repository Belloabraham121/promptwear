import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { json, urlencoded, type NextFunction, type Request, type Response } from 'express';
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
  process.env.BETTER_AUTH_SECRET ??=
    'test-better-auth-secret-at-least-32-chars';
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

function toCookieArray(setCookie: unknown): string[] | undefined {
  if (Array.isArray(setCookie)) return setCookie as string[];
  if (typeof setCookie === 'string') return [setCookie];
  return undefined;
}

describe('Auth (e2e, Better Auth)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const testEmail = `auth-e2e-${Date.now()}@example.com`;
  const testPassword = 'test-password-123';
  const newPassword = 'test-password-456';
  const testName = 'E2E Test User';

  beforeAll(async () => {
    setTestEnv();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    // Mirror main.ts: no global body parser; JSON only off the auth routes.
    app = moduleFixture.createNestApplication({ bodyParser: false });
    prisma = app.get(PrismaService);
    app.setGlobalPrefix('api/v1');
    app.use(cookieParser());
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (
        req.path === '/api/v1/auth' ||
        req.path.startsWith('/api/v1/auth/')
      ) {
        next();
        return;
      }
      json()(req, res, (err: unknown) => {
        if (err) {
          next(err);
          return;
        }
        urlencoded({ extended: true })(req, res, next);
      });
    });
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
    const user = await prisma.user.findUnique({
      where: { email: testEmail },
    });
    if (user) {
      await prisma.verification.deleteMany({
        where: { value: { startsWith: user.id } },
      });
    }
    await prisma.user.deleteMany({ where: { email: testEmail } });
    await app.close();
  });

  it('sign-up -> session cookie -> guarded /users/me -> sign-out', async () => {
    const agent = request.agent(app.getHttpServer());

    const signUpResponse = await agent
      .post('/api/v1/auth/sign-up/email')
      .send({ email: testEmail, password: testPassword, name: testName })
      .expect(200);

    expect(signUpResponse.body.user).toMatchObject({
      email: testEmail,
      name: testName,
    });

    const signUpCookies = parseSetCookie(
      toCookieArray(signUpResponse.headers['set-cookie']),
    );
    expect(signUpCookies['promptwear.session_token']).toBeDefined();

    const sessionResponse = await agent
      .get('/api/v1/auth/get-session')
      .expect(200);
    expect(sessionResponse.body.user).toMatchObject({ email: testEmail });

    // Legacy envelope + guard path: Better Auth session authorizes /users/me.
    const meResponse = await agent.get('/api/v1/users/me').expect(200);
    expect(meResponse.body.data).toMatchObject({
      email: testEmail,
      name: testName,
      role: 'customer',
      guest: false,
    });

    await agent.post('/api/v1/auth/sign-out').expect(200);
    // Better Auth answers signed-out get-session with 200 + null (not 401).
    const afterLogout = await agent
      .get('/api/v1/auth/get-session')
      .expect(200);
    expect(afterLogout.body).toBeNull();
    await agent.get('/api/v1/users/me').expect(401);
  });

  it('duplicate sign-up is rejected; wrong password is rejected', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/sign-up/email')
      .send({ email: testEmail, password: testPassword, name: testName })
      .expect(422);

    await request(app.getHttpServer())
      .post('/api/v1/auth/sign-in/email')
      .send({ email: testEmail, password: 'wrong-password-000' })
      .expect(401);
  });

  it('sign-in with new credentials works after password reset', async () => {
    const agent = request.agent(app.getHttpServer());

    await agent
      .post('/api/v1/auth/sign-in/email')
      .send({ email: testEmail, password: testPassword })
      .expect(200);

    // Dev has no RESEND_API_KEY: the reset email is logged, token read from DB.
    await agent
      .post('/api/v1/auth/request-password-reset')
      .send({ email: testEmail, redirectTo: 'http://localhost:3000/reset-password' })
      .expect(200);

    const user = await prisma.user.findUniqueOrThrow({
      where: { email: testEmail },
    });
    // Better Auth stores reset tokens as identifier=`reset-password:<token>`,
    // value=`<userId>:<expiresAt>`.
    const verification = await prisma.verification.findFirst({
      where: {
        identifier: { startsWith: 'reset-password:' },
        value: { startsWith: user.id },
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(verification).toBeTruthy();

    const token = verification!.identifier.split(':')[1];
    await agent
      .post('/api/v1/auth/reset-password')
      .send({ newPassword, token })
      .expect(200);

    await agent.post('/api/v1/auth/sign-out').expect(200);

    await agent
      .post('/api/v1/auth/sign-in/email')
      .send({ email: testEmail, password: newPassword })
      .expect(200);

    const sessionResponse = await agent
      .get('/api/v1/auth/get-session')
      .expect(200);
    expect(sessionResponse.body.user).toMatchObject({ email: testEmail });
  });
});
