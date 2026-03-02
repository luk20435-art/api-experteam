// src/modules/pr/dto/update-pr.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreatePrDto } from './create-pr.dto';

export class UpdatePrDto extends PartialType(CreatePrDto) {}