import { IsString, IsOptional, IsBoolean, IsEmail } from 'class-validator';

export class CreateTraderDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  traderCode?: string;

  @IsOptional()
  @IsString()
  contactPerson?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  taxId?: string;

  
  @IsOptional()
  @IsString()
  registrationDate?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}