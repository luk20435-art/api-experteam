// src/modules/auth/dto/register.dto.ts
import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { Role } from 'src/common/enum/role.enum';
import { UserRole } from 'src/modules/users/entity/user.entity';

export class RegisterDto {
  @IsEmail({}, { message: 'อีเมลไม่ถูกต้อง' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' })
  password: string;

  @IsString()
  @IsOptional()
  username?: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  // เปลี่ยนจาก string[] เป็น enum Role จริง (ปลอดภัยกว่า)
  @IsEnum(Role, { message: 'role ต้องเป็น user, manager, executive หรือ admin' })
  @IsOptional()
  role?: UserRole;
}