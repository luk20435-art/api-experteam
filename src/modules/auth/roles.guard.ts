// src/common/guards/roles.guard.ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enum/role.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // route ไม่ได้กำหนด role → ผ่าน
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // ยังไม่ login
    if (!user || !user.role) {
      throw new UnauthorizedException('กรุณาเข้าสู่ระบบ');
    }

    // ไม่มี role ที่กำหนด
    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException('คุณไม่มีสิทธิ์เข้าถึง');
    }

    return true;
  }
}
