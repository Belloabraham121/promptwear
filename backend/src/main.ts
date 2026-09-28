import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { json, urlencoded, type NextFunction, type Request, type Response } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  // bodyParser is disabled so Better Auth can read the raw request body on
  // its own routes; JSON parsing is applied selectively below.
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const configService = app.get(ConfigService);

  app.setGlobalPrefix('api/v1');

  app.enableCors({
    origin: configService.getOrThrow<string[]>('allowedOrigins'),
    credentials: true,
  });

  app.use(cookieParser());

  app.use((req: Request, res: Response, next: NextFunction) => {
    // Better Auth owns /api/v1/auth/* and consumes the raw body itself.
    if (req.path === '/api/v1/auth' || req.path.startsWith('/api/v1/auth/')) {
      return next();
    }
    json()(req, res, (err: unknown) => {
      if (err) {
        next(err);
        return;
      }
      urlencoded({ extended: true })(req, res, next);
    });
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Promptwear API')
    .setDescription('Promptwear backend REST API')
    .setVersion('1.0')
    .addCookieAuth('promptwear.session_token')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = configService.getOrThrow<number>('port');
  await app.listen(port);
}

void bootstrap();
