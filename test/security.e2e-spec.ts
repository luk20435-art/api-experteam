import { Controller, Get, INestApplication, Post, Req, Res } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { Response } from 'express';
import { JwtAuthGuard } from '../src/modules/auth/jwt-auth.guard';
import { JwtStrategy } from '../src/modules/auth/jwt.strategy';
import { Public } from '../src/modules/auth/public.decorator';

@Controller('auth')
class TestAuthController {
  constructor(private readonly jwtService: JwtService) {}

  @Public()
  @Post('login')
  login(@Res({ passthrough: true }) res: Response) {
    const token = this.jwtService.sign({ sub: 1, username: 'tester', role: 'admin' });
    res.cookie('access_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/',
    });
    return { ok: true };
  }
}

@Controller('secure')
class SecureController {
  @Get('profile')
  profile(@Req() req: any) {
    return { ok: true, userId: req.user?.id ?? null };
  }
}

describe('Security (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-e2e-secret';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({ secret: process.env.JWT_SECRET }),
      ],
      controllers: [TestAuthController, SecureController],
      providers: [
        {
          provide: JwtStrategy,
          useFactory: () =>
            new JwtStrategy({
              validateUser: async (payload: any) => ({
                id: payload.sub,
                username: payload.username,
                role: payload.role,
              }),
            } as any),
        },
        Reflector,
        { provide: APP_GUARD, useClass: JwtAuthGuard },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('denies protected route without cookie', async () => {
    await request(app.getHttpServer()).get('/secure/profile').expect(401);
  });

  it('allows protected route with login cookie', async () => {
    const loginRes = await request(app.getHttpServer()).post('/auth/login').expect(201);
    const cookie = loginRes.headers['set-cookie'];

    const profileRes = await request(app.getHttpServer())
      .get('/secure/profile')
      .set('Cookie', cookie)
      .expect(200);

    expect(profileRes.body.ok).toBe(true);
    expect(profileRes.body.userId).toBe(1);
  });
});
