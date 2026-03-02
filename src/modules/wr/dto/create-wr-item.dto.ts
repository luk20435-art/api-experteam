// create-pr-item.dto.ts
import { IsString, IsNumber, IsNotEmpty, IsOptional } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreateWrItemDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (value || '').trim())
  description: string;

  @IsNumber()
  @Type(() => Number)
  quantity: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsNumber()
  @Type(() => Number)
  unitPrice: number;

  @IsOptional()
  @IsNumber()
  totalPrice?: number;
}