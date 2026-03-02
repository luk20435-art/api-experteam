import { PartialType } from '@nestjs/mapped-types';
import { CreateWODto } from './create-wo.dto';

export class UpdateWODto extends PartialType(CreateWODto) {}