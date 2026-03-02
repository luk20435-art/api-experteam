// src/modules/po/po.controller.ts

import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  BadRequestException,
  Res,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { PoService } from './po.service';
import { CreatePoDto, PoStatus } from './dto/create-po.dto';
import { UpdatePoDto } from './dto/update-po.dto';

const PO_UPLOAD_DIR = join(process.cwd(), 'uploads', 'po');

@Controller('po')
export class PoController {
  constructor(private readonly poService: PoService) { }

  // สร้าง PO ใหม่
  @Post()
  create(@Body() createPoDto: CreatePoDto) {
    return this.poService.create(createPoDto);
  }

  // ดึง PO ทั้งหมด (ที่ยังไม่ถูกลบ)
  @Get()
  findAll() {
    return this.poService.findAll();
  }

  // ดึง PO ที่อยู่ในถังขยะ
  @Get('trash')
  findTrashed() {
    return this.poService.findTrashed();
  }

  // ค้นหา PO ด้วย keyword
  @Get('search')
  findByKey(@Query('key') key: string) {
    if (!key) {
      throw new BadRequestException('กรุณาระบุ key สำหรับการค้นหา');
    }
    return this.poService.findByKey(key);
  }

  // ดึง PO ตาม ID
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.poService.findOne(id);
  }

  // แก้ไข PO
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updatePoDto: UpdatePoDto) {
    return this.poService.update(id, updatePoDto);
  }

  // ลบ PO แบบ soft delete
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  softDelete(@Param('id', ParseIntPipe) id: number) {
    return this.poService.softDelete(id);
  }

  // กู้คืน PO จากถังขยะ
  @Patch(':id/restore')
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.poService.restore(id);
  }

  // ลบ PO ถาวร
  @Delete(':id/force')
  @HttpCode(HttpStatus.NO_CONTENT)
  forceDelete(@Param('id', ParseIntPipe) id: number) {
    return this.poService.forceDelete(id);
  }

  // อนุมัติ PO
  @Patch(':id/approve')
  @HttpCode(HttpStatus.OK)
  async approve(@Param('id', ParseIntPipe) id: number) {
    const po = await this.poService.findOne(id);

    if (po.status !== PoStatus.PENDING) {
      throw new BadRequestException('สามารถอนุมัติได้เฉพาะ PO ที่รออนุมัติเท่านั้น');
    }

    // ใช้ service update แทนการเข้าถึง repository โดยตรง
    const updateDto: UpdatePoDto = { status: PoStatus.APPROVED };
    return this.poService.update(id, updateDto);
  }

  // ดาวน์โหลด PO เป็น PDF
  @Get(':id/pdf')
  async generatePdf(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response
  ) {
    try {
      const buffer = await this.poService.generatePoPdf(id);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="PO_${id}.pdf"`
      );
      res.setHeader('Content-Length', buffer.length);

      res.end(buffer);
    } catch (error) {
      res.status(500).json({
        statusCode: 500,
        message: 'Failed to generate PDF',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  @Post(':id/duplicate')
  @HttpCode(HttpStatus.CREATED)
  async duplicate(@Param('id', ParseIntPipe) id: number) {
    return this.poService.duplicate(id);
  }

  @Post(':id/attachments')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          if (!existsSync(PO_UPLOAD_DIR)) mkdirSync(PO_UPLOAD_DIR, { recursive: true });
          cb(null, PO_UPLOAD_DIR);
        },
        filename: (_req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `po-file-${uniqueSuffix}${extname(file.originalname)}`);
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
    return this.poService.addAttachments(id, files);
  }
}
