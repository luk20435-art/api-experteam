import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { Role } from '../enum/role.enum';

function createContext(request: any): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as any;
}

describe('PermissionsGuard', () => {
  it('allows when route has no required permissions', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(undefined) } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);
    const context = createContext({ user: null, params: {} });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('throws UnauthorizedException when permissions are required but user is missing', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['user']) } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);
    const context = createContext({ user: null, params: {} });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('allows self access when target id matches authenticated user', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['self']) } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);
    const context = createContext({
      user: { id: 10, role: Role.USER },
      params: { id: '10' },
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('throws ForbiddenException when user lacks required permission', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['user']) } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);
    const context = createContext({
      user: { id: 11, role: Role.USER },
      params: {},
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
