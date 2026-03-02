// src/modules/depart/dto/update-depart.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateDepartDto } from './create-depart.dto';

export class UpdateDepartDto extends PartialType(CreateDepartDto) {}