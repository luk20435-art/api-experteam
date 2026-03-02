import { IsString, IsOptional, IsBoolean, IsEmail } from 'class-validator';

export class CreateSupplierDto {
  @IsString()
  companyName: string;

  @IsOptional()
  @IsString()
  group?: string;

  @IsOptional()
  @IsString()
  product?: string;

  @IsOptional()
  @IsString()
  contactName?: string;

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
  taxId?: string;

  @IsOptional()
  @IsString()
  paymentTerm?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}