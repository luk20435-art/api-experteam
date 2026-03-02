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
import type { Response } from 'express';
import { PattycashService } from './pattycash.service';
import { CreatePattycashDto, CreatePattycashItemDto, CreateApprovalDto } from './dto/create-pattycash.dto';
import { UpdatePattycashDto } from './dto/update-pattycash.dto';

@Controller('pattycash')
export class PattycashController {
  constructor(private readonly pattycashService: PattycashService) { }

  // Create Pattycash พร้อมรองรับไฟล์แนบ
  @Post()
  @UseInterceptors(FilesInterceptor('remarkFiles')) // รับไฟล์จาก field 'remarkFiles'
  async create(
    @Body() dto: CreatePattycashDto,
    @UploadedFiles() files: Express.Multer.File[], 
  ) {
    return this.pattycashService.createPattycash(dto, files);
  }

  @Get()
  findAll() {
    return this.pattycashService.findAll();
  }

  @Get('trash')
  findTrashed() {
    return this.pattycashService.findTrashed();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.pattycashService.findOne(id);
  }

  // Submit for approval
  @Post(':id/submit')
  submit(@Param('id', ParseIntPipe) id: number) {
    return this.pattycashService.submitForApproval(id);
  }

  // Add item to pattycash
  @Post(':id/item')
  addItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreatePattycashItemDto,
  ) {
    return this.pattycashService.addItem(id, dto);
  }

  // Add approval
  @Post(':id/approval')
  addApproval(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateApprovalDto,
  ) {
    return this.pattycashService.addApproval(id, dto);
  }

  // Update pattycash พร้อมรองรับการเพิ่มไฟล์ใหม่
  @Patch(':id')
  @UseInterceptors(FilesInterceptor('remarkFiles'))
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: any,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.pattycashService.updatePattycash(id, dto as UpdatePattycashDto, files);
  }

  // Approve pattycash
  @Patch(':id/approve')
  @HttpCode(HttpStatus.OK)
  async approve(@Param('id', ParseIntPipe) id: number) {
    try {
      return await this.pattycashService.approve(id);
    } catch (err: any) {
      throw new BadRequestException(err.message || 'ไม่สามารถอนุมัติได้');
    }
  }

  // Reject pattycash
  @Put(':id/reject')
  reject(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { email: string; remark?: string },
  ) {
    return this.pattycashService.reject(id, body.email, body.remark);
  }

  // Soft delete
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  softDelete(@Param('id', ParseIntPipe) id: number) {
    return this.pattycashService.softDelete(id);
  }

  // Restore
  @Patch(':id/restore')
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.pattycashService.restore(id);
  }

  // Force delete
  @Delete(':id/force')
  @HttpCode(HttpStatus.NO_CONTENT)
  forceDelete(@Param('id', ParseIntPipe) id: number) {
    return this.pattycashService.forceDelete(id);
  }

  // Generate PDF
  @Get(':id/pdf')
  async generatePdf(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const buffer = await this.pattycashService.generatePdf(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Pattycash_${id}.pdf"`,
    });
    res.send(buffer);
  }

  // Duplicate
  @Post(':id/duplicate')
  @HttpCode(HttpStatus.CREATED)
  duplicate(@Param('id', ParseIntPipe) id: number) {
    return this.pattycashService.duplicate(id);
  }
}
