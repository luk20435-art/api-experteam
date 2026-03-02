import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { TraderService } from './trader.service';
import { CreateTraderDto } from './dto/create-trader.dto';

@Controller('traders')
export class TraderController {
  constructor(private traderService: TraderService) {}

  @Post()
  create(@Body() dto: CreateTraderDto) {
    return this.traderService.create(dto);
  }

  @Get()
  findAll() {
    return this.traderService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.traderService.findOne(id);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateTraderDto) {
    return this.traderService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.traderService.softDelete(id);
  }
}