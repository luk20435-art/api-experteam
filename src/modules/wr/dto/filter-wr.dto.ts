// dto/filter-wr.dto.ts
import { IsOptional, IsString, IsInt, IsEnum, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';

export class FilterWrDto {
  @IsOptional() @Transform(({ value }) => parseInt(value)) @IsInt()
  page?: number;

  @IsOptional() @Transform(({ value }) => parseInt(value)) @IsInt()
  limit?: number;
  
  @IsOptional() @Transform(({ value }) => parseInt(value)) @IsInt()
  requestedBy?: number;

  @IsOptional() @Transform(({ value }) => parseInt(value)) @IsInt()
  departmentId?: number;

  @IsOptional() @IsDateString()
  startDate?: string;

  @IsOptional() @IsDateString()
  endDate?: string;

  @IsOptional() @IsString()
  search?: string;
}