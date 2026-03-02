// src/modules/pattycash/dto/create-pattycash.dto.ts
// (เฉพาะส่วนที่เกี่ยวข้องกับ items - ไฟล์เต็มอาจมีส่วนอื่น ๆ อยู่แล้ว)

import { IsString, IsNumber, IsOptional, IsPositive, ValidateNested, IsArray, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

// DTO สำหรับแต่ละรายการสินค้า (item)
export class CreatePattycashItemDto {
  @IsString({ message: 'ชื่อรายการต้องเป็นข้อความและห้ามว่าง' })
  @IsOptional()
  name: string;

  @IsString({ message: 'คำอธิบายต้องเป็นข้อความ' })
  @IsOptional()
  description?: string;

  @IsNumber({}, { message: 'จำนวนต้องเป็นตัวเลข' })
  @IsPositive({ message: 'จำนวนต้องมากกว่า 0' })
  quantity: number;

  @IsString({ message: 'หน่วยต้องเป็นข้อความ' })
  @IsOptional()
  unit?: string;

  @IsNumber({}, { message: 'ราคาต่อหน่วยต้องเป็นตัวเลข' })
  @IsOptional()
  unitPrice?: number;

  @IsNumber({}, { message: 'ราคารวมต้องเป็นตัวเลข' })
  @IsOptional()
  totalPrice?: number;
}

// ใน CreatePattycashDto (ส่วน items)
export class CreatePattycashDto {
  // ... fields อื่น ๆ ของคุณ

  @IsArray({ message: 'items ต้องเป็น array' })
  @ValidateNested({ each: true })
  @Type(() => CreatePattycashItemDto)
  items: CreatePattycashItemDto[]; // ไม่ใช้ ? เพื่อบังคับส่ง items
}