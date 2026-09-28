import { INestApplication } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  createTestApp,
  makeAdmin,
  newAgent,
  setTestEnv,
  signIn,
  signUp,
  type TestAgent,
} from './helpers';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { RedisService } from '../src/modules/redis/redis.service';

describe('Admin Analytics (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let redis: RedisService;

  const runId = Date.now();
  const adminEmail = `analytics-admin-${runId}@example.com`;
  const customerEmail = `analytics-customer-${runId}@example.com`;
  const repeatEmail = `analytics-repeat-${runId}@example.com`;
  const testPassword = 'test-password-123';

  let adminUserId = '';
  let customerUserId = '';
  let repeatUserId = '';
  let vendorId = '';
  let adminAgent: TestAgent | null = null;
  const orderIds: string[] = [];
  const designIds: string[] = [];

  const today = '2026-08-29';
  const yesterday = '2026-08-28';

  beforeAll(async () => {
    setTestEnv();
    ({ app, prisma } = await createTestApp());
    redis = app.get(RedisService);

    // Users register through Better Auth (creates credential accounts);
    // the admin is promoted afterwards.
    const setupAgent = newAgent(app);
    await signUp(setupAgent, {
      email: adminEmail,
      name: 'Analytics Admin',
      password: testPassword,
    });
    await makeAdmin(prisma, adminEmail);
    const admin = await prisma.user.findUniqueOrThrow({
      where: { email: adminEmail },
    });
    adminUserId = admin.id;

    const customerAgent = newAgent(app);
    await signUp(customerAgent, {
      email: customerEmail,
      name: 'Analytics Customer',
      password: testPassword,
    });
    const customer = await prisma.user.findUniqueOrThrow({
      where: { email: customerEmail },
    });
    customerUserId = customer.id;

    const repeatAgent = newAgent(app);
    await signUp(repeatAgent, {
      email: repeatEmail,
      name: 'Repeat Customer',
      password: testPassword,
    });
    const repeatCustomer = await prisma.user.findUniqueOrThrow({
      where: { email: repeatEmail },
    });
    repeatUserId = repeatCustomer.id;

    const vendor = await prisma.vendor.create({
      data: {
        name: 'Analytics Test Vendor',
        location: 'Lagos',
        qualityRating: 4.5,
        customerRating: 4.4,
        capacityPerWeek: 500,
        priceIndex: 1.05,
        onTimeRate: 0.91,
        active: true,
        garmentCostByQuality: { standard: 4000, premium: 6000, heavy: 8000 },
        printingCostByMethod: { dtf: 2400, screen: 1700 },
        materialAvailable: ['standard', 'premium'],
        printMethods: ['dtf', 'screen'],
        deliveryRegions: ['Lagos'],
        shippingCostBase: 1800,
        shippingCostPerUnit: 80,
        estimatedProductionDays: 3,
        deliverySlaDays: 6,
      },
    });
    vendorId = vendor.id;

    const designA = await prisma.design.create({
      data: {
        userId: customerUserId,
        title: 'Flame Tee',
        color: '#070807',
      },
    });
    const designB = await prisma.design.create({
      data: {
        userId: customerUserId,
        title: 'Campus Run',
        color: '#d6ff3c',
      },
    });
    designIds.push(designA.id, designB.id);

    const lineA = {
      designId: designA.id,
      designTitle: 'Flame Tee',
      color: '#070807',
      quality: 'standard',
      print: 'dtf',
      sizes: { S: 2, M: 3, L: 0, XL: 0, XXL: 0 },
    };
    const lineB = {
      designId: designB.id,
      designTitle: 'Campus Run',
      color: '#d6ff3c',
      quality: 'premium',
      print: 'screen',
      sizes: { S: 0, M: 1, L: 2, XL: 0, XXL: 0 },
    };

    const orderA = await prisma.order.create({
      data: {
        userId: customerUserId,
        status: OrderStatus.order_received,
        line: lineA,
        subtotal: 45_000,
        delivery: 2_500,
        total: 47_500,
        vendorId,
        createdAt: new Date(`${yesterday}T12:00:00.000Z`),
      },
    });
    const orderB = await prisma.order.create({
      data: {
        userId: customerUserId,
        status: OrderStatus.delivered,
        line: lineB,
        subtotal: 28_000,
        delivery: 2_500,
        total: 30_500,
        vendorId,
        createdAt: new Date(`${today}T10:00:00.000Z`),
      },
    });
    const orderC = await prisma.order.create({
      data: {
        userId: repeatUserId,
        status: OrderStatus.order_received,
        line: lineA,
        subtotal: 20_000,
        delivery: 2_500,
        total: 22_500,
        vendorId,
        createdAt: new Date(`${today}T11:00:00.000Z`),
      },
    });
    const orderD = await prisma.order.create({
      data: {
        userId: repeatUserId,
        status: OrderStatus.shipped,
        line: lineB,
        subtotal: 18_000,
        delivery: 2_500,
        total: 20_500,
        vendorId,
        createdAt: new Date(`${today}T12:00:00.000Z`),
      },
    });
    const cancelled = await prisma.order.create({
      data: {
        userId: customerUserId,
        status: OrderStatus.cancelled,
        line: lineA,
        subtotal: 10_000,
        delivery: 0,
        total: 10_000,
        createdAt: new Date(`${today}T13:00:00.000Z`),
      },
    });

    orderIds.push(orderA.id, orderB.id, orderC.id, orderD.id, cancelled.id);

    adminAgent = newAgent(app);
    await signIn(adminAgent, { email: adminEmail, password: testPassword });
  });

  afterAll(async () => {
    await redis.connect();
    await redis.client.del(`analytics:daily:${today}`);
    await redis.client.del(`analytics:daily:${yesterday}`);

    if (orderIds.length > 0) {
      await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    }
    if (designIds.length > 0) {
      await prisma.design.deleteMany({ where: { id: { in: designIds } } });
    }
    if (vendorId) {
      await prisma.vendor.delete({ where: { id: vendorId } });
    }

    await prisma.user.deleteMany({
      where: {
        id: { in: [adminUserId, customerUserId, repeatUserId] },
      },
    });

    await app.close();
  });

  async function loginAs(email: string) {
    const agent = newAgent(app);
    await signIn(agent, { email, password: testPassword });
    return agent;
  }

  it('rejects unauthenticated requests', async () => {
    await request(app.getHttpServer()).get('/api/v1/admin/analytics').expect(401);
  });

  it('rejects non-admin users', async () => {
    const agent = await loginAs(customerEmail);
    await agent.get('/api/v1/admin/analytics').expect(403);
  });

  it('returns analytics snapshot with real order data', async () => {
    const response = await adminAgent!.get('/api/v1/admin/analytics').expect(200);

    expect(response.body.data).toMatchObject({
      repeatCustomers: {
        label: 'Repeat buyers',
      },
    });
    expect(response.body.data.revenue).toBeGreaterThanOrEqual(
      47_500 + 30_500 + 22_500 + 20_500,
    );
    expect(response.body.data.orderCount).toBeGreaterThanOrEqual(4);
    expect(response.body.data.conversionRate).toBeGreaterThan(0);
    expect(response.body.data.repeatCustomers.count).toBeGreaterThanOrEqual(2);
    expect(response.body.data.revenueLabel).toContain('₦');
    expect(response.body.data.conversionLabel).toMatch(/^\d+%$/);
    expect(response.body.data.bestSelling).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: 'Flame Tee', units: 10, revenue: 70_000 }),
        expect.objectContaining({ title: 'Campus Run', units: 6, revenue: 51_000 }),
      ]),
    );
    expect(response.body.data.vendorPerformance).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: vendorId,
          name: 'Analytics Test Vendor',
          active: true,
        }),
      ]),
    );
  });

  it('returns revenue time series from daily rollups', async () => {
    const response = await adminAgent!
      .get(`/api/v1/admin/analytics/revenue?from=${yesterday}&to=${today}`)
      .expect(200);

    expect(response.body.data).toEqual([
      { date: yesterday, revenue: 47_500, orderCount: 1 },
      { date: today, revenue: 30_500 + 22_500 + 20_500, orderCount: 3 },
    ]);
  });

  it('returns bestsellers ranked by units', async () => {
    const response = await adminAgent!.get('/api/v1/admin/analytics/bestsellers').expect(200);

    expect(response.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: 'Flame Tee',
          units: 10,
          revenue: 47_500 + 22_500,
        }),
        expect.objectContaining({
          title: 'Campus Run',
          units: 6,
          revenue: 30_500 + 20_500,
        }),
      ]),
    );
  });

  it('rejects revenue ranges wider than 366 days', async () => {
    await adminAgent!
      .get('/api/v1/admin/analytics/revenue?from=2020-01-01&to=2026-12-31')
      .expect(400);
  });

  it('rejects revenue range when from is after to', async () => {
    await adminAgent!
      .get(`/api/v1/admin/analytics/revenue?from=${today}&to=${yesterday}`)
      .expect(400);
  });
});
