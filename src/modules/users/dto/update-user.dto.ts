import { IsOptional, MinLength, IsEnum } from 'class-validator';
import { Role } from '../../../common/enum/role.enum';

export class UpdateUserDto {
  @IsOptional()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
