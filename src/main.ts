import 'dotenv/config';
import { NestFactory, Reflector } from '@nestjs/core';
import { json, urlencoded, static as expressStatic } from 'express';
import cookieParser from 'cookie-parser';
import { ClassSerializerInterceptor, ValidationPipe, Logger, BadRequestException } from '@nestjs/common';
import { AppModule } from './app.module';
import { JwtAuthGuard } from './modules/auth/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { join } from 'path';

function parseAllowedOrigins(): string[] {
  const raw = process.env.CORS_ORIGINS;
  if (raw) {
    return raw
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
  }

  return ['http://localhost:3001', 'http://localhost:3000'];
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  app.use(cookieParser());
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));
  app.use('/uploads', expressStatic(join(process.cwd(), 'uploads')));

  const allowedOrigins = parseAllowedOrigins();
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Authorization,Accept',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      exceptionFactory: (errors) => {
        const formattedErrors = errors.map((err) => ({
          property: err.property,
          constraints: err.constraints,
        }));
        return new BadRequestException({
          statusCode: 400,
          message: 'Validation failed',
          errors: formattedErrors,
        });
      },
    }),
  );

  app.setGlobalPrefix('api');

  const reflector = app.get(Reflector);
  app.useGlobalGuards(new JwtAuthGuard(reflector), new RolesGuard(reflector));
  app.useGlobalInterceptors(new ClassSerializerInterceptor(reflector));

  const port = Number(process.env.PORT || 3000);
  await app.listen(port);
  Logger.log(`Server running on http://localhost:${port}/api`, 'Bootstrap');
}

bootstrap();
