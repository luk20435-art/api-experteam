import { IsEmail, IsOptional } from 'class-validator';
import { PoApprovalStatus } from '../entity/po-approvals.entity';

export class CreatePoApprovalDto {
  @IsEmail()
  approverEmail: string;

  @IsOptional()
  status?: PoApprovalStatus;

  @IsOptional()
  comment?: string;
}
