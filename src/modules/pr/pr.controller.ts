import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Res,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import type { Response } from 'express';
import { existsSync, mkdirSync } from 'fs';
import { PrService } from './pr.service';
import { CreatePrDto } from './dto/create-pr.dto';
import { UpdatePrDto } from './dto/update-pr.dto';
import { CreatePrItemDto } from './dto/create-pr-item.dto';
import { CreateApprovalDto } from './dto/create-pr-approval.dto';

const PR_UPLOAD_DIR = join(process.cwd(), 'uploads', 'pr');

function ensurePrUploadDir() {
  if (!existsSync(PR_UPLOAD_DIR)) {
    mkdirSync(PR_UPLOAD_DIR, { recursive: true });
  }
}

@Controller('pr')
export class PrController {
  constructor(private readonly prService: PrService) {}

  // ================= CREATE PR (Main Endpoint) =================
  // ✅ แก้ไข: เพิ่ม Interceptor ตรงนี้ เพื่อให้รับ FormData และไฟล์จาก Frontend ได้
  @Post()
  @UseInterceptors(
    FilesInterceptor('remarkFiles', 10, { // ⚠️ ชื่อ field ต้องตรงกับ Frontend ('remarkFiles')
      storage: diskStorage({
        destination: (req, file, callback) => {
          ensurePrUploadDir();
          callback(null, PR_UPLOAD_DIR);
        },
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          // แก้ปัญหาสระภาษาไทยในชื่อไฟล์ (optional)
          const fileExtName = extname(file.originalname);
          const name = file.fieldname + '-' + uniqueSuffix + fileExtName;
          callback(null, name);
        },
      }),
      fileFilter: (req, file, callback) => {
        const allowedMimes = [
          'application/pdf',
          'image/jpeg',
          'image/png',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ];
        if (!allowedMimes.includes(file.mimetype)) {
          return callback(new BadRequestException('อนุญาตเฉพาะไฟล์ PDF, รูปภาพ, และเอกสาร Office'), false);
        }
        callback(null, true);
      },
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  )
  async create(
    @Body() dto: CreatePrDto,
    @UploadedFiles() files: Express.Multer.File[], // รับไฟล์ที่นี่
  ) {
    // ส่งทั้ง DTO และ Files ไปที่ Service
    return this.prService.createPr(dto, files);
  }

  // ================= (Optional) CREATE PR + UPLOAD FILES แยก =================
  // เก็บไว้ตามเดิมเผื่อใช้ทดสอบ แต่ Frontend ปัจจุบันยิงเข้าเส้นข้างบน
  @Post('upload')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: diskStorage({
        destination: './uploads/pr',
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/\/(pdf|jpg|jpeg|png|msword|vnd.openxmlformats-officedocument.wordprocessingml.document)$/)) {
          return callback(new Error('Only PDF, JPG, PNG, DOC/DOCX files are allowed'), false);
        }
        callback(null, true);
      },
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  createWithFiles(
    @Body() dto: CreatePrDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.prService.createPr(dto, files);
  }

  @Get()
  findAll() {
    return this.prService.findAll();
  }

  @Get('trash')
  findTrashed() {
    return this.prService.findTrashed();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.prService.findOne(id);
  }

  // ================= UPDATE =================
  @Patch(':id')
  @UseInterceptors(
    FilesInterceptor('remarkFiles', 10, {
      storage: diskStorage({
        destination: (req, file, callback) => {
          ensurePrUploadDir();
          callback(null, PR_UPLOAD_DIR);
        },
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const fileExtName = extname(file.originalname);
          const name = file.fieldname + '-' + uniqueSuffix + fileExtName;
          callback(null, name);
        },
      }),
      fileFilter: (req, file, callback) => {
        const allowedMimes = [
          'application/pdf',
          'image/jpeg',
          'image/png',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ];
        if (!allowedMimes.includes(file.mimetype)) {
          return callback(new BadRequestException('อนุญาตเฉพาะไฟล์ PDF, รูปภาพ, และเอกสาร Office'), false);
        }
        callback(null, true);
      },
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePrDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.prService.updatePr(id, dto as CreatePrDto, files);
  }

  // ================= APPROVE / REJECT =================
  @Patch(':id/approve')
  @HttpCode(HttpStatus.OK)
  async approve(@Param('id', ParseIntPipe) id: number) {
    try {
      const pr = await this.prService.approvePr(id);
      return pr;
    } catch (err: any) {
      throw new BadRequestException(err.message || 'ไม่สามารถอนุมัติได้');
    }
  }

  @Put(':id/reject')
  reject(
    @Param('id', ParseIntPipe) id: number,
    @Body() { email, remark }: { email: string; remark?: string },
  ) {
    return this.prService.rejectPr(id, email, remark);
  }

  @Post(':id/submit')
  submit(@Param('id', ParseIntPipe) id: number) {
    return this.prService.submitForApproval(id);
  }

  // ================= DUPLICATE =================
  @Post(':id/duplicate')
  @HttpCode(HttpStatus.CREATED)
  async duplicate(@Param('id', ParseIntPipe) id: number) {
    return this.prService.duplicate(id);
  }

  // ================= ITEMS / APPROVALS =================
  @Post(':id/item')
  addItem(@Param('id', ParseIntPipe) id: number, @Body() dto: CreatePrItemDto) {
    return this.prService.addItem(id, dto);
  }

  @Post(':id/approval')
  addApproval(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateApprovalDto) {
    return this.prService.addApproval(id, dto);
  }

  // ================= SOFT / FORCE DELETE / RESTORE =================
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  softDelete(@Param('id', ParseIntPipe) id: number) {
    return this.prService.softDelete(id);
  }

  @Patch(':id/restore')
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.prService.restore(id);
  }

  @Delete(':id/force')
  @HttpCode(HttpStatus.NO_CONTENT)
  forceDelete(@Param('id', ParseIntPipe) id: number) {
    return this.prService.forceDelete(id);
  }

  // ================= GENERATE PDF =================
  @Get(':id/pdf')
  async generatePdf(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const buffer = await this.prService.generatePrPdf(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="PR_${id}.pdf"`,
    });
    res.send(buffer);
  }

  // ================= UPLOAD ADDITIONAL ATTACHMENTS =================
  @Post(':id/attachments')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: diskStorage({
        destination: './uploads/pr', // โฟลเดอร์เก็บไฟล์
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        // สามารถกรองชนิดไฟล์ได้
        if (!file.mimetype.match(/\/(jpg|jpeg|png|pdf|docx?|vnd.openxmlformats-officedocument.spreadsheetml.sheet)$/)) {
          return cb(new BadRequestException('ไฟล์ต้องเป็น JPG, PNG, PDF, DOC/DOCX, XLSX'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB ต่อไฟล์
    }),
  )
  async uploadAttachments(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('กรุณาเลือกไฟล์อย่างน้อย 1 ไฟล์');
    }

    // เรียก Service เพื่ออัปเดต attachments ใน PR
    return this.prService.addAttachments(id, files);
  }
}
