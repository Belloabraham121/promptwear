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

describe('Studio (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const testEmail = `studio-e2e-${Date.now()}@example.com`;
  const testPassword = 'test-password-123';
  const testName = 'Studio E2E User';
  let designId: string;

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
    if (designId) {
      await prisma.design.deleteMany({ where: { id: designId } });
    }
    await prisma.user.deleteMany({ where: { email: testEmail } });
    await app.close();
  });

  it('register -> create design -> chat -> get history -> generate', async () => {
    const agent = request.agent(app.getHttpServer());

    await agent
      .post('/api/v1/auth/register')
      .send({
        email: testEmail,
        password: testPassword,
        name: testName,
      })
      .expect(201);

    const createCsrf = await fetchCsrfToken(agent);
    const createResponse = await agent
      .post('/api/v1/designs')
      .set('X-CSRF-Token', createCsrf)
      .send({
        title: 'Studio Chat Tee',
        color: '#1a1a1a',
        prompt: '',
        method: 'prompt',
        activePanel: 'front',
      })
      .expect(201);

    designId = createResponse.body.data.id as string;

    const chatCsrf = await fetchCsrfToken(agent);
    const chatResponse = await agent
      .post(`/api/v1/designs/${designId}/chat`)
      .set('X-CSRF-Token', chatCsrf)
      .send({ text: 'minimal geometric pattern on the front' })
      .expect(201);

    expect(chatResponse.body.data.reply).toMatchObject({
      role: 'assistant',
      text: expect.stringContaining('minimal geometric pattern'),
    });
    expect(chatResponse.body.data.chat).toHaveLength(2);
    expect(chatResponse.body.data.chat[0]).toMatchObject({
      role: 'user',
      text: 'minimal geometric pattern on the front',
    });

    const historyResponse = await agent
      .get(`/api/v1/designs/${designId}/chat`)
      .expect(200);

    expect(historyResponse.body.data.chat).toHaveLength(2);

    const designAfterChat = await agent
      .get(`/api/v1/designs/${designId}`)
      .expect(200);

    expect(designAfterChat.body.data.prompt).toBe(
      'minimal geometric pattern on the front',
    );

    const generateCsrf = await fetchCsrfToken(agent);
    const generateResponse = await agent
      .post(`/api/v1/designs/${designId}/generate`)
      .set('X-CSRF-Token', generateCsrf)
      .send({ panel: 'front', quality: 'low', size: '1024x1024' })
      .expect(202);

    expect(generateResponse.body.data.jobId).toBeTruthy();

    const jobId = generateResponse.body.data.jobId as string;
    await new Promise((resolve) => setTimeout(resolve, 1200));

    const jobResponse = await agent
      .get(`/api/v1/designs/${designId}/generate/${jobId}`)
      .expect(200);

    // Without OPENAI_API_KEY the job fails with a clear config error.
    expect(['completed', 'failed']).toContain(jobResponse.body.data.job.status);
    if (jobResponse.body.data.job.status === 'failed') {
      expect(jobResponse.body.data.job.error).toMatch(/OPENAI_API_KEY|OpenAI/i);
    } else {
      expect(jobResponse.body.data.job.result?.imageUrl).toBeTruthy();
    }
  });
});
