import { Transform, Type, Expose, plainToInstance } from 'class-transformer'; // 👈 1. เพิ่ม Expose
import {
  IsOptional,
  IsString,
  IsNumber,
  IsDateString,
  IsArray,
  IsEnum,
  IsBoolean,
  ValidateNested,
  IsNotEmpty,
} from 'class-validator';
import { PaymentMethod, PrStatus } from '../entity/pr.entity';
import { CreateApprovalDto } from './create-pr-approval.dto';

export class CreatePrItemDto {
  @Expose() // 👈 2. ใส่ Expose ทุกฟิลด์ เพื่อบังคับให้ map ค่าเข้ามา
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

export class CreatePrDto {
  @IsNumber()
  @Transform(({ value }) => Number(value))
  jobId: number;

  @IsNumber()
  @Transform(({ value }) => Number(value))
  supplierId: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => (value ? Number(value) : null))
  depart?: number | null;

  @IsString()
  @IsNotEmpty()
  requester: string;

  @IsOptional()
  @IsString()
  jobNote?: string;

  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  extraCharge: boolean;

  @IsOptional()
  @IsDateString()
  requestDate?: string;

  @IsOptional()
  @IsDateString()
  requiredDate?: string;

  @IsOptional()
  @IsString()
  deliveryLocation?: string;

  @IsOptional()
  @IsString()
  planType?: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value) || 7)
  vatPercent?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value) || 0)
  discountPercent?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value) || 0)
  estimatedPrCost?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value) || 0)
  jobBalanceCost?: number;

  @IsOptional()
  @IsString()
  trader?: string;

  @IsOptional()
  @IsString()
  jobNo?: string;

  @IsOptional()
  @IsString()
  ccNo?: string;

  @IsOptional()
  @IsString()
  expteamQuotation?: string;

  
  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  discountType?: string;

  @IsOptional()
  @IsString()
  discountValue?: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod; // 👈 เพิ่มฟิลด์นี้

  @IsOptional()
  @IsString()
  paymentTerms?: string; // 👈 เพิ่มฟิลด์นี้

  @IsOptional()
  @IsString()
  remark?: string;

  @IsOptional()
  @IsEnum(PrStatus)
  status?: PrStatus;

  // -------------------------------------------------------
  // ✅ ส่วนสำคัญ: การแปลง Items
  // -------------------------------------------------------
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePrItemDto)
  @Transform(({ value }) => {
    // 1. ถ้าค่ามาเป็น String (จาก FormData)
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);

        // 🔥 จุดเปลี่ยนชีวิต: บังคับแปลง Object ธรรมดา ให้เป็น Class Instance ทันที
        // เพื่อป้องกันไม่ให้ ValidationPipe ลบข้อมูลทิ้ง
        return plainToInstance(CreatePrItemDto, parsed);

      } catch (error) {
        return [];
      }
    }

    // 2. ถ้ามาเป็น Object อยู่แล้ว (กรณีเทสด้วย JSON raw body)
    return plainToInstance(CreatePrItemDto, value);
  })
  items: CreatePrItemDto[];
  
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateApprovalDto)
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return value || [];
  })
  approvals?: CreateApprovalDto[];

  @IsOptional()
  remarkFiles?: any;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value) ?? 0)
  withholdingPercent?: number;
}