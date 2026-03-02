import { IsEmail, IsOptional } from 'class-validator';
import { WoApprovalStatus } from '../entity/wo-approval.entity';

export class CreatePoApprovalDto {
  @IsEmail()
  approverEmail: string;

  @IsOptional()
  status?: WoApprovalStatus;

  @IsOptional()
  comment?: string;
}
