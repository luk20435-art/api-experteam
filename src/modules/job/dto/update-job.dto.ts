import { PartialType } from '@nestjs/mapped-types';
import { CreateJobDto } from './create-job.dto';
import { IsOptional, IsNumber, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateJobDto extends PartialType(CreateJobDto) {
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : Number(value)))
  @IsNumber()
  traderId?: number | null;

  @IsOptional()
  @IsBoolean()
  isDraft?: boolean;
}