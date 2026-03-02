// src/modules/po/dto/update-po.dto.ts

import { PartialType } from '@nestjs/mapped-types';
import { PaymentMethod } from 'src/modules/pr/entity/pr.entity';
import { IsEnum, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreatePoDto, PoStatus } from './create-po.dto';
import { UpdatePrDto } from '../../pr/dto/update-pr.dto';  // ✅ แก้ path ให้ถูกต้อง (จาก modules/po/dto ไป modules/pr/dto)

export class UpdatePoDto extends PartialType(CreatePoDto) {
    status?: PoStatus;
    
    @IsOptional()
    @IsEnum(PaymentMethod)
    paymentMethod?: PaymentMethod;
    
    invoice?: string;
    tax?: string;
    
    // ✅ เพิ่ม nested PR data สำหรับอัปเดต
    @IsOptional()
    @ValidateNested()
    @Type(() => UpdatePrDto)
    pr?: UpdatePrDto;
}
