import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../enum/role.enum';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) { }

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>('permissions', [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!required || required.length === 0) return true;
    if (!user) {
      throw new UnauthorizedException('กรุณาเข้าสู่ระบบ');
    }

    const permsMap: Record<Role, string[]> = {
      [Role.ADMIN]: ['*'], 
      [Role.EXECUTIVE]: ['pr', 'po', 'wr', 'wo', 'job', 'user'],
      [Role.MANAGER]: ['pr', 'po', 'wr', 'wo', 'job', 'user'],
      [Role.USER]: ['self'],
    };


    if (user.role === Role.ADMIN) return true;

    if (required.includes('self')) {
      const targetId = Number(request.params?.id);
      if (targetId === user.id) return true;
      throw new ForbiddenException('คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้');
    }

    const allowed = required.some((p) => permsMap[user.role]?.includes(p));
    if (!allowed) {
      throw new ForbiddenException('คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้');
    }
    return true;
  }
}
