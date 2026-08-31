import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PasswordService } from '../src/modules/auth/password.service';
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

describe('Admin (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let passwordService: PasswordService;

  const adminEmail = `admin-e2e-${Date.now()}@example.com`;
  const customerEmail = `customer-e2e-${Date.now()}@example.com`;
  const testPassword = 'test-password-123';
  const materialId = `mat_e2e_${Date.now()}`;
  const vendorId = `ven_e2e_${Date.now()}`;

  beforeAll(async () => {
    setTestEnv();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get(PrismaService);
    passwordService = app.get(PasswordService);
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

    const passwordHash = await passwordService.hash(testPassword);

    await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'Admin E2E User',
        passwordHash,
        role: 'admin',
      },
    });

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
    const agent = request.agent(app.getHttpServer());

    await agent
      .post('/api/v1/auth/login')
      .send({ email: adminEmail, password: testPassword })
      .expect(201);

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
    const agent = request.agent(app.getHttpServer());

    await agent
      .post('/api/v1/auth/register')
      .send({
        email: customerEmail,
        password: testPassword,
        name: 'Customer E2E User',
      })
      .expect(201);

    const csrfToken = await fetchCsrfToken(agent);

    await agent
      .patch(`/api/v1/admin/vendors/${vendorId}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ name: 'Should Fail' })
      .expect(403);
  });

  it('public GET /catalog/colors works without auth', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/catalog/colors')
      .expect(200);
  });
});
