// src/modules/project/project.controller.ts

import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Patch,
  Delete,
  HttpCode,
  ParseIntPipe,
  Put,
} from '@nestjs/common';

import { JobService } from './job.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';

@Controller('jobs')
export class JobController {
  constructor(private readonly jobService: JobService) {}

  @Post()
  create(@Body() dto: CreateJobDto) {
    return this.jobService.create(dto);
  }

  @Get()
  findAll() {
    return this.jobService.findAll();
  }

  @Get('trash')
  getTrashed() {
    return this.jobService.findTrashed();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.jobService.findOne(id);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateJobDto) {
    return this.jobService.update(id, dto);
  }

  @Delete(':id')
  softDelete(@Param('id', ParseIntPipe) id: number) {
    return this.jobService.softDelete(id);
  }

  @Post(':id/restore')
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.jobService.restore(id);
  }

  @Delete(':id/force')
  @HttpCode(204)
  forceDelete(@Param('id', ParseIntPipe) id: number) {
    return this.jobService.forceDelete(id);
  }
}
