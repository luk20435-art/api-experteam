import { PartialType } from '@nestjs/mapped-types';
import { CreateWRDto } from './create-wr.dto';

export class UpdateWRDto extends PartialType(CreateWRDto) {}