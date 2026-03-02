import { IsString, IsNumber, IsOptional, IsEnum, ValidateNested, IsArray, IsBoolean } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PattycashStatus } from '../entity/pattycash.entity';
import { ApprovalStatus } from '../entity/pattycash-approvals.entity';

export class CreatePattycashItemDto {
  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsNumber()
  quantity: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsNumber()
  unitPrice?: number;

  @IsOptional()
  @IsNumber()
  totalPrice?: number;
}

export class CreateApprovalDto {
  @IsString()
  approverEmail: string;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsEnum(ApprovalStatus, { message: 'เธชเธ–เธฒเธเธฐเธญเธเธธเธกเธฑเธ•เธดเนเธกเนเธ–เธนเธเธ•เนเธญเธ (เน€เธเนเธ PENDING, APPROVED, REJECTED)' })
  @IsOptional()
  status?: ApprovalStatus;

  @IsString({ message: 'เธฅเธฒเธขเน€เธเนเธเธ•เนเธญเธเน€เธเนเธเธเนเธญเธเธงเธฒเธก (เน€เธเนเธ URL เธซเธฃเธทเธญ base64)' })
  @IsOptional()
  signatureImage?: string;
}

export class CreatePattycashDto {
  @IsString()
  requester: string;

  // 1. เธ—เธณเนเธซเน Job ID เน€เธเนเธ Optional เนเธฅเธฐเนเธเธฅเธเธเนเธฒ
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  jobId?: number;

  @IsOptional()
  @IsString()
  jobNote?: string;

  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  extraCharge: boolean;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  supplierId?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  departId?: number;

  @IsOptional()
  @IsString()
  deliveryLocation?: string;

  @IsOptional()
  @IsString()
  requestDate?: string;

  @IsOptional()
  @IsString()
  requiredDate?: string;

  @IsOptional()
  @IsString()
  remark?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number) // เน€เธเธดเนเธก Type เน€เธเธทเนเธญเธกเธฒเน€เธเนเธ String
  vatPercent?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  discountPercent?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  withholdingPercent?: number;

  @IsOptional()
  @IsEnum(PattycashStatus)
  status?: PattycashStatus;

  // 2. เน€เธเธดเนเธก Transform เน€เธเธทเนเธญเนเธเธฅเธ JSON String เธเธฒเธ FormData เนเธซเนเน€เธเนเธ Object
  @IsOptional()
  @Transform(({ value }) => {
    // เธ–เนเธฒเธเนเธฒเธ—เธตเนเน€เธเนเธฒเธกเธฒเน€เธเนเธ String (เธเธฒเธ FormData) เนเธซเนเธฅเธญเธ Parse JSON
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (error) {
        return []; // เธ–เนเธฒ Parse เนเธกเนเนเธ”เน เนเธซเนเธเธทเธเธเนเธฒ Array เธงเนเธฒเธ
      }
    }
    return value; // เธ–เนเธฒเน€เธเนเธ Array เธญเธขเธนเนเนเธฅเนเธง (เธเธฒเธ JSON Body) เธเนเนเธเนเนเธ”เนเน€เธฅเธข
  })
  @ValidateNested({ each: true })
  @Type(() => CreatePattycashItemDto)
  @IsArray()
  items?: CreatePattycashItemDto[];

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (error) {
        return [];
      }
    }
    return value;
  })
  @ValidateNested({ each: true })
  @Type(() => CreateApprovalDto)
  @IsArray()
  approvals?: CreateApprovalDto[];
}
