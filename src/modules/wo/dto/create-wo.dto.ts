// src/modules/wo/dto/create-wo.dto.ts

import {
  IsOptional,
  IsString,
  IsNumber,
  IsArray,
  ValidateNested,
  IsDateString,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

class CreateWOItemDto {
  @IsString()
  description: string;

  @IsNumber()
  quantity: number;

  @IsOptional()
  @IsString()
  unit?: string = 'ชิ้น';

  @IsNumber({}, { message: 'unitPrice ต้องเป็นตัวเลข' })
  unitPrice: number;
}

export enum WOStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export class CreateWODto {
  @IsOptional()
  @IsNumber()
  wrId?: number | null;

  @IsOptional()
  @IsNumber()
  supplierId?: number; // เพิ่มเพื่อให้บันทึก Supplier จาก WR ได้

  @IsOptional()
  @IsNumber()
  departId?: number;   // เพิ่มเพื่อให้บันทึก Department จาก WR ได้

  @IsString()
  requester: string;

  @IsDateString()
  orderDate: string;

  @IsOptional()
  @IsDateString()
  deliveryDate?: string;

  @IsOptional()
  @IsString()
  deliveryLocation?: string;

  @IsOptional()
  @IsString()
  remark?: string;

  @IsOptional()
  @IsString()
  planType?: string;

  @IsOptional()
  @IsString()
  tax?: string;

  @IsOptional()
  @IsString()
  depart?: string; // เพิ่มเพื่อให้รับชื่อแผนกมาบันทึกตรงๆ ได้

  @IsOptional()
  @IsString()
  supplier?: string;       // เพิ่ม: ภาษีหัก ณ ที่จ่าย

  @IsOptional()
  @IsString()
  currency?: string = 'THB';

  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string; // 'cash' หรือ 'credit'

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateWOItemDto)
  items: CreateWOItemDto[];

  @IsOptional()
  @IsEnum(WOStatus)
  status?: WOStatus = WOStatus.PENDING;
}