import { Transform } from 'class-transformer';
import { IsString, IsOptional, IsEmail, IsNumber, IsEnum, IsBoolean } from 'class-validator';

export type JobStatus = 'in_progress' | 'completed';

export class CreateJobDto {
  @IsString()
  jobName: string;

  @IsOptional()
  @IsString()
  projectCode?: string;

  @IsOptional()
  @IsString()
  jobNo?: string;

  @IsOptional()
  @IsString()
  ccNo?: string;

  @IsOptional()
  @IsString()
  waNumber?: string;

  @IsOptional()
  @IsString()
  wrPoSrRoNumber?: string;

  @IsOptional()
  @IsString()
  contactPerson?: string;

  @IsOptional()
  @IsString()
  contactNumber?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @Transform(({ value }) => (value === null || value === '' ? null : Number(value)))
  @IsNumber({}, { message: 'traderId ต้องเป็นตัวเลข' })
  traderId?: number | null;

  @IsOptional()
  @IsString()
  trader?: string;

  @IsOptional()
  @IsString()
  expteamQuotation?: string;

  @IsOptional()
  @IsNumber()
  estimatedPrCost?: number;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  remark?: string;

  @IsOptional()
  @IsBoolean()
  isDraft?: boolean = false; 

  @IsOptional()
  @IsEnum(['in_progress', 'completed'])
  status?: JobStatus;

  // Budget
  @IsOptional()
  @IsNumber()
  budgetMaterial?: number;

  @IsOptional()
  @IsNumber()
  budgetManPower?: number;

  @IsOptional()
  @IsNumber()
  budgetOp?: number;

  @IsOptional()
  @IsNumber()
  budgetIe?: number;

  @IsOptional()
  @IsNumber()
  budgetSupply?: number;

  @IsOptional()
  @IsNumber()
  budgetEngineer?: number;

  // Approval Users
  @IsString()
  requesterId: string;

  @IsString()
  originatorId: string;

  @IsString()
  storeId: string;

  @IsString()
  approverId: string;
}
