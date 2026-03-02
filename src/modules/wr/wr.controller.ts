import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Query,
  ParseIntPipe,
  BadRequestException,
  Res,
  StreamableFile,
  HttpStatus,
  HttpCode,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';

import type { Response } from 'express';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';

import { WrService } from './wr.service';
import { CreateWRDto } from './dto/create-wr.dto';
import { UpdateWRDto } from './dto/update-wr.dto';

const WR_UPLOAD_DIR = join(process.cwd(), 'uploads', 'wr');

@Controller('wr')
export class WrController {
  constructor(private readonly wrService: WrService) {}

  @Post()
  create(@Body() createWRDto: CreateWRDto) {
    return this.wrService.create(createWRDto);
  }

  @Get()
  findAll() {
    return this.wrService.findAll();
  }

  @Get('trash')
  findTrashed() {
    return this.wrService.findTrashed();
  }

  @Get('search')
  findByKey(@Query('key') key: string) {
    if (!key) throw new BadRequestException('กรุณาระบุ key สำหรับการค้นหา');
    return this.wrService.findByKey(key);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.wrService.findOne(id);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateWRDto: UpdateWRDto) {
    return this.wrService.update(id, updateWRDto);
  }

  // อนุมัติ
  @Put(':id/approve')
  approve(@Param('id', ParseIntPipe) id: number, @Body('email') email: string) {
    if (!email) throw new BadRequestException('กรุณาระบุ email ผู้อนุมัติ');
    return this.wrService.approve(id, email);
  }

  @Delete(':id')
  softDelete(@Param('id', ParseIntPipe) id: number) {
    return this.wrService.softDelete(id);
  }

  @Put(':id/restore')
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.wrService.restore(id);
  }

  @Delete(':id/force')
  forceDelete(@Param('id', ParseIntPipe) id: number) {
    return this.wrService.forceDelete(id);
  }

  // PDF
  @Get(':id/pdf')
  async generatePdf(
    @Param('id', ParseIntPipe) id: number,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const buffer = await this.wrService.generateWrPdf(id);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Length': buffer.length,
      'Content-Disposition': `inline; filename="WR_${id}.pdf"`,
    });

    return new StreamableFile(buffer);
  }

  // ✅ DUPLICATE - คัดลอกเฉพาะ DRAFT
  @Post(':id/duplicate')
  @HttpCode(HttpStatus.CREATED)
  async duplicate(@Param('id', ParseIntPipe) id: number) {
    return this.wrService.duplicate(id);
  }

  @Post(':id/attachments')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          if (!existsSync(WR_UPLOAD_DIR)) mkdirSync(WR_UPLOAD_DIR, { recursive: true });
          cb(null, WR_UPLOAD_DIR);
        },
        filename: (_req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `wr-file-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        const allowedMimes = [
          'image/jpeg',
          'image/png',
          'image/gif',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ];
        if (!allowedMimes.includes(file.mimetype)) {
          return cb(new BadRequestException('Unsupported file type'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  uploadAttachments(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }
    return this.wrService.addAttachments(id, files);
  }

  @Get(':id/attachments')
  getAttachments(@Param('id') id: string) {
    return { attachments: [] };
  }
}
