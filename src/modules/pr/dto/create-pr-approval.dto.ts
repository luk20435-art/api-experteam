import { ApprovalStatus } from '../entity/pr-approvals.entity';
import { IsEmail, IsOptional, IsString } from 'class-validator';

export class CreateApprovalDto {
  @IsEmail()
  approverEmail: string;


  @IsString()
  status?: ApprovalStatus;


  @IsOptional()
  comment?: string;
}
