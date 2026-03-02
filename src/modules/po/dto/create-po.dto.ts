// src/modules/po/dto/create-po.dto.ts
import {
  IsOptional,
  IsString,
  IsNumber,
  IsArray,
  ValidateNested,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreatePoItemDto {
  @IsOptional()
  @IsString()
  description?: string = '';

  @IsNumber()
  quantity: number;

  @IsOptional()
  @IsString()
  unit?: string = 'ชิ้น';

  @IsNumber()
  unitPrice: number;
}

export enum PoStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SUBMITTED = 'submitted',
}

export class CreatePoDto {
  @IsOptional()
  @IsNumber()
  prId?: number;

  @IsString()
  orderDate: string;

  @IsOptional()
  @IsString()
  deliveryDate?: string;

  @IsOptional()
  @IsString()
  remark?: string;

  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @IsOptional()
  @IsString()
  currency?: string = 'THB';

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePoItemDto)
  items?: CreatePoItemDto[] = [];

  @IsOptional()
  @IsNumber()
  vatPercent?: number;

  @IsOptional()
  @IsNumber()
  discountPercent?: number;

  @IsOptional()
  @IsNumber()
  withholdingPercent?: number;

  @IsOptional()
  @IsEnum(PoStatus)
  status?: PoStatus = PoStatus.PENDING;

  @IsOptional()
  @IsString()
  invoice?: string;

  @IsOptional()
  @IsString()
  tax?: string;
}
