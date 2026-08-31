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

const ALL_QUALITIES = ['standard', 'premium', 'heavy'] as const;
const ALL_PRINTS = ['dtf', 'screen'] as const;

async function seedPricingData(prisma: PrismaService): Promise<void> {
  await prisma.vendor.upsert({
    where: { id: 'ven_lagos_press' },
    create: {
      id: 'ven_lagos_press',
      name: 'Lagos Press Co.',
      location: 'Ikeja, Lagos',
      qualityRating: 4.6,
      customerRating: 4.5,
      capacityPerWeek: 1200,
      priceIndex: 1.0,
      onTimeRate: 0.94,
      active: true,
      notes: 'Primary DTF partner',
      garmentCostByQuality: {
        standard: 4200,
        premium: 6100,
        heavy: 8000,
      },
      printingCostByMethod: { dtf: 2400, screen: 1700 },
      materialAvailable: ALL_QUALITIES,
      printMethods: ALL_PRINTS,
      deliveryRegions: ['Lagos', 'Ogun', 'Ibadan', 'Nationwide'],
      shippingCostBase: 1800,
      shippingCostPerUnit: 80,
      estimatedProductionDays: 3,
      deliverySlaDays: 6,
    },
    update: {
      active: true,
      excluded: false,
    },
  });

  await prisma.profitSettings.upsert({
    where: { id: 'default' },
    create: {
      id: 'default',
      defaultMarginPct: 28,
      rushMarginPct: 38,
      minMarginPct: 15,
      maxMarginPct: 45,
      selectionStrategy: 'lowest_cost',
      excludedVendorIds: [],
      overrideVendorId: null,
    },
    update: {
      defaultMarginPct: 28,
      rushMarginPct: 38,
      minMarginPct: 15,
      maxMarginPct: 45,
      selectionStrategy: 'lowest_cost',
      excludedVendorIds: [],
      overrideVendorId: null,
    },
  });

  const expiresAt = new Date(Date.now() + 45 * 86_400_000);
  await prisma.coupon.upsert({
    where: { code: 'WELCOME10' },
    create: {
      id: 'cpn_welcome',
      code: 'WELCOME10',
      type: 'percent',
      value: 10,
      maxRedemptions: 100,
      redemptionCount: 0,
      active: true,
      expiresAt,
    },
    update: {
      active: true,
      redemptionCount: 0,
      expiresAt,
    },
  });
}

describe('Orders (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const testEmail = `orders-e2e-${Date.now()}@example.com`;
  const adminEmail = `orders-admin-e2e-${Date.now()}@example.com`;
  const testPassword = 'test-password-123';
  const testName = 'Orders E2E User';
  let createdDesignId = '';
  let createdOrderId = '';

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
    await seedPricingData(prisma);
  });

  afterAll(async () => {
    if (createdOrderId) {
      await prisma.couponRedemption.deleteMany({
        where: { orderId: createdOrderId },
      });
      await prisma.orderStatusEvent.deleteMany({
        where: { orderId: createdOrderId },
      });
      await prisma.order.deleteMany({ where: { id: createdOrderId } });
    }
    if (createdDesignId) {
      await prisma.design.deleteMany({ where: { id: createdDesignId } });
    }
    await prisma.user.deleteMany({
      where: { email: { in: [testEmail, adminEmail] } },
    });
    await app.close();
  });

  it('quote -> coupon validate -> place order -> list/get/patch -> admin status', async () => {
    const agent = request.agent(app.getHttpServer());

    await agent
      .post('/api/v1/auth/register')
      .send({
        email: testEmail,
        password: testPassword,
        name: testName,
      })
      .expect(201);

    let csrfToken = await fetchCsrfToken(agent);

    const createDesignResponse = await agent
      .post('/api/v1/designs')
      .set('X-CSRF-Token', csrfToken)
      .send({
        title: 'Order Tee',
        color: '#1a1a1a',
        prompt: 'bold stripes',
        method: 'prompt',
        status: 'saved',
      })
      .expect(201);

    createdDesignId = createDesignResponse.body.data.id as string;

    csrfToken = await fetchCsrfToken(agent);
    const quoteResponse = await agent
      .post('/api/v1/orders/quote')
      .set('X-CSRF-Token', csrfToken)
      .send({
        quality: 'standard',
        print: 'dtf',
        sizes: { S: 0, M: 2, L: 1, XL: 0, XXL: 0 },
        deliveryCity: 'Lagos',
        deliveryState: 'Lagos',
      })
      .expect(201);

    expect(quoteResponse.body.data.qty).toBe(3);
    expect(quoteResponse.body.data.total).toBeGreaterThan(0);
    expect(quoteResponse.body.data.vendor).toBeTruthy();

    const couponResponse = await request(app.getHttpServer())
      .post('/api/v1/coupons/validate')
      .send({
        code: 'WELCOME10',
        orderTotal: String(quoteResponse.body.data.total),
      })
      .expect(201);

    expect(couponResponse.body.data.valid).toBe(true);
    expect(couponResponse.body.data.discountAmount).toBeGreaterThan(0);

    csrfToken = await fetchCsrfToken(agent);
    const orderResponse = await agent
      .post('/api/v1/orders')
      .set('X-CSRF-Token', csrfToken)
      .set('Idempotency-Key', `orders-e2e-${Date.now()}`)
      .send({
        designId: createdDesignId,
        quality: 'standard',
        print: 'dtf',
        sizes: { S: 0, M: 2, L: 1, XL: 0, XXL: 0 },
        couponCode: 'WELCOME10',
        note: 'Leave at reception',
        checkout: {
          contact: {
            fullName: 'Orders E2E User',
            email: testEmail,
            phone: '+2348012345678',
          },
          address: {
            line1: '12 Admiralty Way',
            city: 'Lagos',
            state: 'Lagos',
            country: 'Nigeria',
          },
          paymentMethod: 'card',
        },
      })
      .expect(201);

    createdOrderId = orderResponse.body.data.id as string;
    expect(orderResponse.body.data.status).toBe('order_received');
    expect(orderResponse.body.data.total).toBeLessThan(
      quoteResponse.body.data.total,
    );
    expect(orderResponse.body.data.pricing?.couponCode).toBe('WELCOME10');

    const designAfterOrder = await agent
      .get(`/api/v1/designs/${createdDesignId}`)
      .expect(200);
    expect(designAfterOrder.body.data.status).toBe('ordered');

    const listResponse = await agent.get('/api/v1/orders').expect(200);
    expect(listResponse.body.data.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: createdOrderId }),
      ]),
    );

    const getResponse = await agent
      .get(`/api/v1/orders/${createdOrderId}`)
      .expect(200);
    expect(getResponse.body.data.note).toBe('Leave at reception');

    csrfToken = await fetchCsrfToken(agent);
    const patchResponse = await agent
      .patch(`/api/v1/orders/${createdOrderId}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ note: 'Updated delivery note' })
      .expect(200);
    expect(patchResponse.body.data.note).toBe('Updated delivery note');

    await agent.get('/api/v1/admin/orders').expect(403);

    const { PasswordService } = await import(
      '../src/modules/auth/password.service'
    );
    const passwordService = new PasswordService();
    const passwordHash = await passwordService.hash(testPassword);

    await prisma.user.upsert({
      where: { email: adminEmail },
      create: {
        email: adminEmail,
        name: 'Orders Admin',
        passwordHash,
        role: 'admin',
      },
      update: {
        passwordHash,
        role: 'admin',
      },
    });

    const adminAgent = request.agent(app.getHttpServer());
    await adminAgent
      .post('/api/v1/auth/login')
      .send({ email: adminEmail, password: testPassword })
      .expect(201);

    const adminList = await adminAgent.get('/api/v1/admin/orders').expect(200);
    expect(adminList.body.data.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: createdOrderId }),
      ]),
    );

    const adminCsrf = await fetchCsrfToken(adminAgent);
    const statusResponse = await adminAgent
      .patch(`/api/v1/admin/orders/${createdOrderId}/status`)
      .set('X-CSRF-Token', adminCsrf)
      .send({ status: 'design_confirmed' })
      .expect(200);
    expect(statusResponse.body.data.status).toBe('design_confirmed');

    await adminAgent
      .patch(`/api/v1/admin/orders/${createdOrderId}/status`)
      .set('X-CSRF-Token', adminCsrf)
      .send({ status: 'shipped' })
      .expect(400);

    await prisma.couponRedemption.deleteMany({
      where: { orderId: createdOrderId },
    });
    await prisma.orderStatusEvent.deleteMany({
      where: { orderId: createdOrderId },
    });
    await prisma.order.deleteMany({ where: { id: createdOrderId } });
    await prisma.design.update({
      where: { id: createdDesignId },
      data: { status: 'saved' },
    });
    createdOrderId = '';
  });
});
