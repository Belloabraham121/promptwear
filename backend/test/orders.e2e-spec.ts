import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import {
  createTestApp,
  makeAdmin,
  newAgent,
  setTestEnv,
  signIn,
  signUp,
} from './helpers';
import { PrismaService } from '../src/modules/prisma/prisma.service';

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
    ({ app, prisma } = await createTestApp());
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
    const agent = newAgent(app);

    await signUp(agent, {
      email: testEmail,
      password: testPassword,
      name: testName,
    });

    const createDesignResponse = await agent
      .post('/api/v1/designs')
      .send({
        title: 'Order Tee',
        color: '#1a1a1a',
        prompt: 'bold stripes',
        method: 'prompt',
        status: 'saved',
      })
      .expect(201);

    createdDesignId = createDesignResponse.body.data.id as string;

    const quoteResponse = await agent
      .post('/api/v1/orders/quote')
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

    const couponResponse = await newAgent(app)
      .post('/api/v1/coupons/validate')
      .send({
        code: 'WELCOME10',
        orderTotal: String(quoteResponse.body.data.total),
      })
      .expect(201);

    expect(couponResponse.body.data.valid).toBe(true);
    expect(couponResponse.body.data.discountAmount).toBeGreaterThan(0);

    const orderResponse = await agent
      .post('/api/v1/orders')
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

    const patchResponse = await agent
      .patch(`/api/v1/orders/${createdOrderId}`)
      .send({ note: 'Updated delivery note' })
      .expect(200);
    expect(patchResponse.body.data.note).toBe('Updated delivery note');

    await agent.get('/api/v1/admin/orders').expect(403);

    const setupAgent = newAgent(app);
    await signUp(setupAgent, {
      email: adminEmail,
      name: 'Orders Admin',
      password: testPassword,
    });
    await makeAdmin(prisma, adminEmail);

    const adminAgent = newAgent(app);
    await signIn(adminAgent, { email: adminEmail, password: testPassword });

    const adminList = await adminAgent.get('/api/v1/admin/orders').expect(200);
    expect(adminList.body.data.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: createdOrderId }),
      ]),
    );

    const statusResponse = await adminAgent
      .patch(`/api/v1/admin/orders/${createdOrderId}/status`)
      .send({ status: 'design_confirmed' })
      .expect(200);
    expect(statusResponse.body.data.status).toBe('design_confirmed');

    await adminAgent
      .patch(`/api/v1/admin/orders/${createdOrderId}/status`)
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
