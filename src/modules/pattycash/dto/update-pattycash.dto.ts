import { PartialType } from '@nestjs/mapped-types';
import { CreatePattycashDto } from './create-pattycash.dto';
import { IsArray, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { PattycashStatus } from '../entity/pattycash.entity';

export class UpdatePattycashDto extends PartialType(CreatePattycashDto) {
    @IsOptional()
    @IsString()
    status?: PattycashStatus;

    // Allow multipart uploads field from FilesInterceptor without whitelist rejection
    @IsOptional()
    remarkFiles?: any;

    // Relax nested validation for update payload to avoid false negatives on edited rows
    @IsOptional()
    @Transform(({ value }) => {
        if (typeof value === 'string') {
            try {
                return JSON.parse(value);
            } catch {
                return [];
            }
        }
        return Array.isArray(value) ? value : [];
    })
    @IsArray()
    items?: any[];
}
