import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import {
  createTestApp,
  newAgent,
  setTestEnv,
  signUp,
} from './helpers';
import { PrismaService } from '../src/modules/prisma/prisma.service';

describe('Studio (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const testEmail = `studio-e2e-${Date.now()}@example.com`;
  const testPassword = 'test-password-123';
  const testName = 'Studio E2E User';
  let designId: string;

  beforeAll(async () => {
    setTestEnv();
    ({ app, prisma } = await createTestApp());
  });

  afterAll(async () => {
    if (designId) {
      await prisma.design.deleteMany({ where: { id: designId } });
    }
    await prisma.user.deleteMany({ where: { email: testEmail } });
    await app.close();
  });

  it('register -> create design -> chat -> get history -> generate', async () => {
    const agent = newAgent(app);

    await signUp(agent, {
      email: testEmail,
      password: testPassword,
      name: testName,
    });

    const createResponse = await agent
      .post('/api/v1/designs')
      .send({
        title: 'Studio Chat Tee',
        color: '#1a1a1a',
        prompt: '',
        method: 'prompt',
        activePanel: 'front',
      })
      .expect(201);

    designId = createResponse.body.data.id as string;

    const chatResponse = await agent
      .post(`/api/v1/designs/${designId}/chat`)
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

    const generateResponse = await agent
      .post(`/api/v1/designs/${designId}/generate`)
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
