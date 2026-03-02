// src/modules/pr/dto/attachment.dto.ts
import { IsString, IsNumber } from 'class-validator';

export class AttachmentDto {
  @IsString()
  fileName: string;

  @IsString()
  originalFileName: string;

  @IsString()
  filePath: string;

  @IsString()
  mimeType: string;

  @IsNumber()
  fileSize: number;
}
