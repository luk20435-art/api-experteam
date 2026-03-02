import { IsEmail, IsString, IsEnum, MinLength, IsOptional, IsBoolean } from 'class-validator';
import { Role } from '../../../common/enum/role.enum';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
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

  @IsOptional()
  @IsEnum(Role)
  role?: String;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;  // ← เพิ่มบรรทัดนี้
}
