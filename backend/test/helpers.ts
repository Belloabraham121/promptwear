import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import {
  json,
  urlencoded,
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';

export function setTestEnv(): void {
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

/** Mirror main.ts: no global body parser; JSON only off the auth routes. */
export async function createTestApp(): Promise<{
  app: INestApplication<App>;
  prisma: PrismaService;
}> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication({ bodyParser: false });
  const prisma = app.get(PrismaService);
  app.setGlobalPrefix('api/v1');
  app.use(cookieParser());
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path === '/api/v1/auth' || req.path.startsWith('/api/v1/auth/')) {
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
  return { app, prisma };
}

export type TestAgent = ReturnType<typeof request.agent>;

export function newAgent(app: INestApplication<App>): TestAgent {
  return request.agent(app.getHttpServer());
}

export async function signUp(
  agent: TestAgent,
  input: { email: string; password: string; name: string },
): Promise<void> {
  await agent
    .post('/api/v1/auth/sign-up/email')
    .send(input)
    .expect(200);
}

export async function signIn(
  agent: TestAgent,
  input: { email: string; password: string },
): Promise<void> {
  await agent
    .post('/api/v1/auth/sign-in/email')
    .send(input)
    .expect(200);
}

/** Promote an already-registered (signed-up) user to staff admin. */
export async function makeAdmin(
  prisma: PrismaService,
  email: string,
): Promise<void> {
  await prisma.user.update({ where: { email }, data: { role: 'admin' } });
}
