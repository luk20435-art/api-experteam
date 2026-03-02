import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  NotFoundException,
  ConflictException,
  UsePipes,
  ValidationPipe,
  Patch,
} from '@nestjs/common';
import { CreateDepartDto } from './dto/create-depart.dto';
import { DepartService } from './depart.service';
import { Depart } from './entity/depart.entity';
import { UpdateDepartDto } from './dto/update-depart.dto';

@Controller('departs')
export class DepartController {
  constructor(private readonly departService: DepartService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async create(@Body() dto: CreateDepartDto): Promise<Depart> {
    try {
      return await this.departService.create(dto);
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw error;
    }
  }

  @Get()
  async findAll(): Promise<Depart[]> {
    return await this.departService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Depart> {
    const depart = await this.departService.findOne(id);
    if (!depart) {
      throw new NotFoundException(`แผนก ID ${id} ไม่พบ`);
    }
    return depart;
  }

  @Put(':id')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDepartDto, 
  ): Promise<Depart> {
    return await this.departService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.departService.softDelete(id);
  }
}