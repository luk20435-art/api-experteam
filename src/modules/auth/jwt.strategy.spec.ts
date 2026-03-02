import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'unit-test-secret';
  });

  it('extracts token from cookie before bearer header', () => {
    const authService = { validateUser: jest.fn() } as any;
    const strategy = new JwtStrategy(authService);
    const extractor = (strategy as any)._jwtFromRequest;

    const token = extractor({
      cookies: { access_token: 'cookie-token' },
      headers: { authorization: 'Bearer header-token' },
    });

    expect(token).toBe('cookie-token');
  });

  it('falls back to bearer header when cookie is missing', () => {
    const authService = { validateUser: jest.fn() } as any;
    const strategy = new JwtStrategy(authService);
    const extractor = (strategy as any)._jwtFromRequest;

    const token = extractor({
      cookies: {},
      headers: { authorization: 'Bearer header-token' },
    });

    expect(token).toBe('header-token');
  });

  it('throws UnauthorizedException when validated user is missing', async () => {
    const authService = { validateUser: jest.fn().mockResolvedValue(null) } as any;
    const strategy = new JwtStrategy(authService);

    await expect(strategy.validate({ sub: 1 })).rejects.toThrow(UnauthorizedException);
  });
});
