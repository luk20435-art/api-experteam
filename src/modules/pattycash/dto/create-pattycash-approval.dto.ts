import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApprovalStatus } from '../entity/pattycash-approvals.entity'; // ปรับ path ให้ถูก

export class CreateApprovalDto {
  @IsString({ message: 'อีเมลผู้อนุมัติต้องเป็นข้อความ' })
  approverEmail: string;

  @IsString({ message: 'ความเห็นต้องเป็นข้อความ' })
  @IsOptional()
  comment?: string;

  @IsEnum(ApprovalStatus, { message: 'สถานะอนุมัติไม่ถูกต้อง' })
  @IsOptional()   // ทำให้ส่ง status ได้แต่ไม่บังคับ
  status?: ApprovalStatus;

  @IsString({ message: 'ลายเซ็นต้องเป็นข้อความ (เช่น URL หรือ base64)' })
  @IsOptional()
  signatureImage?: string;
}