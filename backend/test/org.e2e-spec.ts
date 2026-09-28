import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import {
  createTestApp,
  newAgent,
  setTestEnv,
  signIn,
  signUp,
  type TestAgent,
} from './helpers';
import { PrismaService } from '../src/modules/prisma/prisma.service';

describe('Organizations (e2e, Better Auth)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const runId = Date.now();
  const ownerEmail = `org-owner-${runId}@example.com`;
  const memberEmail = `org-member-${runId}@example.com`;
  const testPassword = 'test-password-123';
  const orgSlug = `e2e-crew-${runId}`;
  let orgId = '';
  let invitationId = '';

  beforeAll(async () => {
    setTestEnv();
    ({ app, prisma } = await createTestApp());
  });

  afterAll(async () => {
    if (orgId) {
      // Member + invitation rows cascade off the organization.
      await prisma.organization.deleteMany({ where: { id: orgId } });
    }
    // Personal workspaces + memberships cascade off the users.
    await prisma.user.deleteMany({
      where: { email: { in: [ownerEmail, memberEmail] } },
    });
    await app.close();
  });

  it('signup provisions a personal workspace owned by the user', async () => {
    const agent = newAgent(app);
    await signUp(agent, {
      email: ownerEmail,
      password: testPassword,
      name: 'Org Owner',
    });

    const owner = await prisma.user.findUniqueOrThrow({
      where: { email: ownerEmail },
    });
    const membership = await prisma.member.findFirst({
      where: { userId: owner.id, role: 'owner' },
      include: { organization: true },
    });

    expect(membership).toBeTruthy();
    expect(membership!.organization.slug).toContain('org-owner');
  });

  it('owner creates a crew workspace and invites a member by email', async () => {
    const agent = newAgent(app);
    await signIn(agent, { email: ownerEmail, password: testPassword });

    const createResponse = await agent
      .post('/api/v1/auth/organization/create')
      .send({ name: 'E2E Crew', slug: orgSlug })
      .expect(200);

    orgId = createResponse.body.id as string;
    expect(orgId).toBeTruthy();

    const inviteResponse = await agent
      .post('/api/v1/auth/organization/invite-member')
      .send({ email: memberEmail, role: 'member', organizationId: orgId })
      .expect(200);

    invitationId = inviteResponse.body.id as string;
    expect(invitationId).toBeTruthy();
    expect(inviteResponse.body).toMatchObject({
      email: memberEmail,
      role: 'member',
      status: 'pending',
    });
  });

  it('invitee signs up and accepts, becoming a member', async () => {
    const agent: TestAgent = newAgent(app);
    await signUp(agent, {
      email: memberEmail,
      password: testPassword,
      name: 'Org Member',
    });

    const acceptResponse = await agent
      .post('/api/v1/auth/organization/accept-invitation')
      .send({ invitationId })
      .expect(200);

    expect(acceptResponse.body.invitation).toMatchObject({
      id: invitationId,
      status: 'accepted',
    });

    const member = await prisma.user
      .findUniqueOrThrow({ where: { email: memberEmail } })
      .then((user) =>
        prisma.member.findFirst({
          where: { userId: user.id, organizationId: orgId },
        }),
      );
    expect(member).toMatchObject({ role: 'member' });

    const fullResponse = await agent
      .get('/api/v1/auth/organization/get-full-organization')
      .query({ organizationId: orgId })
      .expect(200);

    const emails = (fullResponse.body.members as Array<{ user: { email: string } }>).map(
      (m) => m.user.email,
    );
    expect(emails).toEqual(expect.arrayContaining([ownerEmail, memberEmail]));
  });

  it('member cannot invite others without permission (non-admin invite rejected)', async () => {
    const agent: TestAgent = newAgent(app);
    await signIn(agent, { email: memberEmail, password: testPassword });

    // Members lack the `invitation:create` grant; owners/admins have it.
    await agent
      .post('/api/v1/auth/organization/invite-member')
      .send({
        email: `nope-${runId}@example.com`,
        role: 'member',
        organizationId: orgId,
      })
      .expect(403);
  });
});
