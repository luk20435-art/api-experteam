import { PartialType } from '@nestjs/mapped-types';
import { CreatePoApprovalDto } from './create-po-approval.dto';

export class UpdatePoApprovalDto extends PartialType(CreatePoApprovalDto) {}
