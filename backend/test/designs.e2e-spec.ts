import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  createTestApp,
  newAgent,
  setTestEnv,
  signUp,
} from './helpers';
import { PrismaService } from '../src/modules/prisma/prisma.service';

describe('Designs (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const testEmail = `designs-e2e-${Date.now()}@example.com`;
  const testPassword = 'test-password-123';
  const testName = 'Designs E2E User';
  let createdDesignId: string;

  beforeAll(async () => {
    setTestEnv();
    ({ app, prisma } = await createTestApp());
  });

  afterAll(async () => {
    if (createdDesignId) {
      await prisma.design.deleteMany({ where: { id: createdDesignId } });
    }
    await prisma.user.deleteMany({ where: { email: testEmail } });
    await app.close();
  });

  it('register -> create design -> list -> patch -> delete', async () => {
    const agent = newAgent(app);

    await signUp(agent, {
      email: testEmail,
      password: testPassword,
      name: testName,
    });

    const createResponse = await agent
      .post('/api/v1/designs')
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

    const patchResponse = await agent
      .patch(`/api/v1/designs/${createdDesignId}`)
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

    const deleteResponse = await agent
      .delete(`/api/v1/designs/${createdDesignId}`)
      .expect(200);

    expect(deleteResponse.body.data).toEqual({ id: createdDesignId });

    await agent.get(`/api/v1/designs/${createdDesignId}`).expect(404);

    createdDesignId = '';
  });

  it('rejects unauthenticated design creation', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/designs')
      .send({ title: 'Nope', color: '#000000' })
      .expect(401);
  });
});
