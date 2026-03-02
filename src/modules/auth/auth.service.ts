// src/modules/auth/auth.service.ts
import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { Role } from 'src/common/enum/role.enum';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) { }

  async register(dto: RegisterDto) {
    // เช็คอีเมลซ้ำ
    const exist = await this.usersService.findByEmail(dto.email);
    if (exist) {
      throw new BadRequestException('อีเมลนี้มีผู้ใช้แล้ว');
    }

    // ❌ ลบส่วนนี้ทิ้ง: const hashedPassword = await bcrypt.hash(dto.password, 10);
    // ✅ ส่ง password ดิบๆ ไป เพราะ createWithHashedPassword ใน UsersService จะ Hash ให้เอง

    const user = await this.usersService.createWithHashedPassword({
      email: dto.email,
      password: dto.password, // ส่งรหัสธรรมดาไป
      username: dto.username || dto.email.split('@')[0],
      firstName: dto.firstName || 'User',
      lastName: dto.lastName || '',
      role: dto.role || Role.USER,
      isActive: true,
    });

    // สร้าง JWT
    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
    };
    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  async validateCredentials(username: string, password: string) {
    const user = await this.usersService.findByUsername(username);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }


  async validateUser(payload: any): Promise<any> {
    const user = await this.usersService.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('User not found or invalid token');
    }

    return { id: user.id, username: user.username, role: user.role };
  }

  // Login
  async login(dto: LoginDto) {
    Logger.log(`[LOGIN] Attempt for email: ${dto.email}`, 'AuthService');

    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      Logger.warn('[LOGIN] User not found', 'AuthService');
      throw new UnauthorizedException('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }

    // เทียบรหัสผ่าน
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    Logger.debug(`[LOGIN] Password valid: ${isPasswordValid}`, 'AuthService');

    if (!isPasswordValid) {
      Logger.warn('[LOGIN] Invalid password', 'AuthService');
      throw new UnauthorizedException('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('บัญชีถูกปิดใช้งาน');
    }

    const payload = { sub: user.id, username: user.username, role: user.role };
    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }
}