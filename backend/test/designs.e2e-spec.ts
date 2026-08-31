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

async function fetchCsrfToken(
  agent: ReturnType<typeof request.agent>,
): Promise<string> {
  const csrfResponse = await agent.get('/api/v1/auth/csrf').expect(200);
  return csrfResponse.body.data.token as string;
}

describe('Designs (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const testEmail = `designs-e2e-${Date.now()}@example.com`;
  const testPassword = 'test-password-123';
  const testName = 'Designs E2E User';
  let createdDesignId: string;

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
    if (createdDesignId) {
      await prisma.design.deleteMany({ where: { id: createdDesignId } });
    }
    await prisma.user.deleteMany({ where: { email: testEmail } });
    await app.close();
  });

  it('register -> create design -> list -> patch -> delete', async () => {
    const agent = request.agent(app.getHttpServer());

    await agent
      .post('/api/v1/auth/register')
      .send({
        email: testEmail,
        password: testPassword,
        name: testName,
      })
      .expect(201);

    const csrfToken = await fetchCsrfToken(agent);

    const createResponse = await agent
      .post('/api/v1/designs')
      .set('X-CSRF-Token', csrfToken)
      .send({
        title: 'Summer Tee',
        color: '#1a1a1a',
        prompt: 'minimal geometric pattern',
        method: 'prompt',
      })
      .expect(201);

    expect(createResponse.body.data).toMatchObject({
      title: 'Summer Tee',
      color: '#1a1a1a',
      prompt: 'minimal geometric pattern',
      method: 'prompt',
      status: 'draft',
      garmentId: 'classic',
      activePanel: 'front',
    });
    expect(createResponse.body.data.id).toBeTruthy();
    createdDesignId = createResponse.body.data.id as string;

    const listResponse = await agent.get('/api/v1/designs').expect(200);

    expect(listResponse.body.data.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: createdDesignId,
          title: 'Summer Tee',
        }),
      ]),
    );
    expect(listResponse.body.data.total).toBeGreaterThanOrEqual(1);

    const patchCsrf = await fetchCsrfToken(agent);
    const patchResponse = await agent
      .patch(`/api/v1/designs/${createdDesignId}`)
      .set('X-CSRF-Token', patchCsrf)
      .send({
        title: 'Summer Tee v2',
        status: 'saved',
      })
      .expect(200);

    expect(patchResponse.body.data).toMatchObject({
      id: createdDesignId,
      title: 'Summer Tee v2',
      status: 'saved',
    });

    const getResponse = await agent
      .get(`/api/v1/designs/${createdDesignId}`)
      .expect(200);

    expect(getResponse.body.data.title).toBe('Summer Tee v2');

    const deleteCsrf = await fetchCsrfToken(agent);
    const deleteResponse = await agent
      .delete(`/api/v1/designs/${createdDesignId}`)
      .set('X-CSRF-Token', deleteCsrf)
      .expect(200);

    expect(deleteResponse.body.data).toEqual({ id: createdDesignId });

    await agent.get(`/api/v1/designs/${createdDesignId}`).expect(404);

    createdDesignId = '';
  });
});
