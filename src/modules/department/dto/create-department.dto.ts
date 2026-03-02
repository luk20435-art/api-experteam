import { IsString, IsOptional, IsBoolean, IsEmail } from 'class-validator';

export class CreateDepartmentDto {
  @IsString()
  departmentNumber: string;  // ต้องส่งมาเสมอ (unique)

  @IsString()
  departCode: string;       // ต้องส่งมาเสมอ (unique)

  @IsString()
  departmentName: string;   // ชื่อแผนก - บังคับต้องมี

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
  paymentTerm?: string;     // ถ้า Entity ยังไม่มี field นี้ ค่อยเพิ่มทีหลัง

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}