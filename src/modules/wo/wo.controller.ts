import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
  Put,
  Res,
  StreamableFile,
  HttpCode,
  HttpStatus, // add
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import type { Response } from 'express';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';

import { WoService } from './wo.service';
import { CreateWODto } from './dto/create-wo.dto';
import { UpdateWODto } from './dto/update-wo.dto';
import { Wo } from './entity/wo.entity';

const WO_UPLOAD_DIR = join(process.cwd(), 'uploads', 'wo');

@Controller('wo')
export class WoController {
  constructor(private readonly woService: WoService) { }

  @Post()
  create(@Body() createWODto: CreateWODto): Promise<Wo> {
    return this.woService.create(createWODto);
  }

  @Get()
  findAll(): Promise<Wo[]> {
    return this.woService.findAll();
  }

  @Get('trash')
  findTrashed(): Promise<Wo[]> {
    return this.woService.findTrashed();
  }

  @Get('search')
  findByKey(@Query('key') key: string): Promise<Wo[]> {
    return this.woService.findByKey(key);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Wo> {
    return this.woService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: UpdateWODto) {
    return this.woService.update(+id, body);
  }

  @Patch(':id/approve')
  approve(@Param('id', ParseIntPipe) id: number): Promise<Wo> {
    return this.woService.approve(id);
  }

  @Patch(':id/reject')
  reject(@Param('id', ParseIntPipe) id: number): Promise<Wo> {
    return this.woService.reject(id);
  }

  @Delete(':id')
  softDelete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.woService.softDelete(id);
  }

  @Patch(':id/restore')
  restore(@Param('id', ParseIntPipe) id: number): Promise<Wo> {
    return this.woService.restore(id);
  }

  @Delete(':id/force')
  forceDelete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.woService.forceDelete(id);
  }

  @Get(':id/pdf')
  async generatePdf(
    @Param('id', ParseIntPipe) id: number,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const buffer = await this.woService.generateWoPdf(id);

    // เธ•เธฑเนเธ header เนเธซเนเธ–เธนเธเธ•เนเธญเธ
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Length': buffer.length,
      'Content-Disposition': `inline; filename="WO_${id}.pdf"`,
    });

    return new StreamableFile(buffer);
  }

  @Post(':id/duplicate')
  @HttpCode(HttpStatus.CREATED)
  async duplicate(@Param('id', ParseIntPipe) id: number) {
    return this.woService.duplicate(id);
  }
  @Post(':id/attachments')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          if (!existsSync(WO_UPLOAD_DIR)) mkdirSync(WO_UPLOAD_DIR, { recursive: true });
          cb(null, WO_UPLOAD_DIR);
        },
        filename: (_req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `wo-file-${uniqueSuffix}${extname(file.originalname)}`);
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
    return this.woService.addAttachments(id, files);
  }
}


