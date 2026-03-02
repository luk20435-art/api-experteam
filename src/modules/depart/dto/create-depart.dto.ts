import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateDepartDto {
  @IsString({ message: 'departName ต้องเป็น string และห้ามว่าง' })
  departName: string;       // ← เปลี่ยนเป็น departName (ตรงกับ Entity)

  @IsOptional()
  @IsString({ message: 'departCode ต้องเป็น string' })
  departCode: string;       // ← ทำให้ required ถ้าต้องการ unique (ลบ IsOptional ถ้าบังคับ)

  @IsOptional()
  @IsString()
  supervisor?: string;

  @IsOptional()
  @IsString()
  manager?: string;         // ← แก้จาก manafer เป็น manager

  @IsOptional()
  @IsString()
  storeman?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}