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

describe('Admin (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const adminEmail = `admin-e2e-${Date.now()}@example.com`;
  const customerEmail = `customer-e2e-${Date.now()}@example.com`;
  const testPassword = 'test-password-123';
  const materialId = `mat_e2e_${Date.now()}`;
  const vendorId = `ven_e2e_${Date.now()}`;

  beforeAll(async () => {
    setTestEnv();
    ({ app, prisma } = await createTestApp());

    const setupAgent = newAgent(app);
    await signUp(setupAgent, {
      email: adminEmail,
      name: 'Admin E2E User',
      password: testPassword,
    });
    await makeAdmin(prisma, adminEmail);

    await prisma.material.create({
      data: {
        id: materialId,
        name: 'E2E test cotton',
        gsm: 180,
        composition: '100% cotton',
        costPerUnit: 3000,
        active: true,
      },
    });

    await prisma.vendor.create({
      data: {
        id: vendorId,
        name: 'E2E Test Vendor',
        location: 'Lagos',
        qualityRating: 4.0,
        customerRating: 4.0,
        capacityPerWeek: 500,
        priceIndex: 1.0,
        onTimeRate: 0.9,
        active: true,
        garmentCostByQuality: { standard: 4000, premium: 6000, heavy: 8000 },
        printingCostByMethod: { dtf: 2000, screen: 1500 },
        materialAvailable: ['standard', 'premium'],
        printMethods: ['dtf'],
        deliveryRegions: ['Lagos'],
        shippingCostBase: 1500,
        shippingCostPerUnit: 100,
        estimatedProductionDays: 3,
        deliverySlaDays: 7,
      },
    });
  });

  afterAll(async () => {
    await prisma.vendor.deleteMany({ where: { id: vendorId } });
    await prisma.material.deleteMany({ where: { id: materialId } });
    await prisma.user.deleteMany({
      where: { email: { in: [adminEmail, customerEmail] } },
    });
    await app.close();
  });

  it('admin GET /admin/catalog returns full catalog', async () => {
    const agent = newAgent(app);

    await signIn(agent, { email: adminEmail, password: testPassword });

    const response = await agent.get('/api/v1/admin/catalog').expect(200);

    expect(response.body.data).toMatchObject({
      materials: expect.any(Array),
      garments: expect.any(Array),
      colors: expect.any(Array),
      sizes: expect.any(Array),
    });

    expect(response.body.data.materials).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: materialId,
          name: 'E2E test cotton',
        }),
      ]),
    );
  });

  it('customer PATCH /admin/vendors/:id returns 403', async () => {
    const agent = newAgent(app);

    await signUp(agent, {
      email: customerEmail,
      password: testPassword,
      name: 'Customer E2E User',
    });

    await agent
      .patch(`/api/v1/admin/vendors/${vendorId}`)
      .send({ name: 'Should Fail' })
      .expect(403);
  });

  it('public GET /catalog/colors works without auth', async () => {
    await newAgent(app).get('/api/v1/catalog/colors').expect(200);
  });
});
