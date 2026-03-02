import {
  IsOptional,
  IsString,
  IsNumber,
  IsArray,
  ValidateNested,
  IsEnum,
  IsDateString,
  IsInt,
  IsBoolean,
  IsNotEmpty,
} from 'class-validator';
import { Transform, Type, Expose, plainToInstance } from 'class-transformer'; 

// Enum สำหรับสถานะ WR (ใช้ร่วมกับ entity)
export enum WrStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  RECEIVED = 'received', // เพิ่มตามที่ backend รองรับ
}

export class CreateWrItemDto {
  @Expose() 
  @IsString()
  @IsNotEmpty({ message: 'Description ห้ามว่าง' })
  @Transform(({ value }) => (value || '').trim())
  description: string;

  @Expose() // 👈 ใส่ให้ครบ
  @IsNumber()
  @Type(() => Number)
  quantity: number;

  @Expose()
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value || 'ชิ้น').trim())
  unit?: string;

  @Expose()
  @IsNumber()
  @Transform(({ value }) => Number(value) || 0)
  unitPrice: number;

  @Expose()
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value) || 0)
  totalPrice?: number;
}

export class CreateWRDto {
  @IsOptional()
  @IsInt()
   @Type(() => Number)
  jobId?: number | null;

  @IsOptional()
  @IsInt()
  @Type(() => Number) // 👈 เพิ่มอันนี้
  supplierId?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number) // 👈 เพิ่มอันนี้
  departId?: number;

  @IsOptional()
  @IsString()
  planType?: string;

  @IsString()
  requester: string;

  @IsOptional()
  @IsString()
  jobNote?: string;

  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  extraCharge: boolean;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => (value ? Number(value) : null))
  depart?: number | null;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => (value ? Number(value) : null))
  supplier?: number | null;

  @IsDateString({}, { message: 'requestDate ต้องเป็นรูปแบบวันที่ที่ถูกต้อง (YYYY-MM-DD)' })
  requestDate: string;

  @IsOptional()
  @IsDateString({}, { message: 'requiredDate ต้องเป็นรูปแบบวันที่ที่ถูกต้อง (YYYY-MM-DD)' })
  requiredDate?: string;

  @IsOptional()
  @IsString()
  deliveryLocation?: string;

  @IsOptional()
  @IsString()
  remark?: string;

  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @IsOptional()
  @IsNumber()
  vatPercent?: number;

  @IsOptional()
  @IsNumber()
  discountPercent?: number;


  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateWrItemDto)
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return plainToInstance(CreateWrItemDto, parsed);

      } catch (error) {
        return [];
      }
    }

    return plainToInstance(CreateWrItemDto, value);
  })
  items: CreateWrItemDto[];

  @IsOptional()
  @IsEnum(WrStatus, { message: 'status ต้องเป็น draft, pending, approved, rejected หรือ received เท่านั้น' })
  status?: WrStatus = WrStatus.PENDING;
}