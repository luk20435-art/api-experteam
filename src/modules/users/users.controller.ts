// src/modules/users/users.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/guards/permissions.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { RolesGuard } from '../auth/roles.guard';
import { Role } from 'src/common/enum/role.enum';
import { Roles } from '../auth/roles.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  // เฉพาะ admin
  @Post()
  @Permissions('user')
  create(@Body() dto: CreateUserDto) {
    return this.usersService.createWithHashedPassword(dto);
  }

  // เฉพาะ admin
  @Get()
  @Permissions('user')
  findAll() {
    return this.usersService.findAll();
  }

  // user ดูตัวเอง, admin ดูได้ทั้งหมด
  @Get(':id')
  @Permissions('self', 'user')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  // user อัปเดตตัวเอง, admin อัปเดตได้ทุกคน
  @Patch(':id')
  @Permissions('self', 'user')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(+id, dto);
  }

  // admin เท่านั้น
  @Delete(':id')
  @Permissions('user')
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }

  @Patch(':id/role')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)  // เฉพาะ admin เท่านั้นที่ทำได้
  async updateRole(
    @Param('id') id: number,
    @Body() dto: { role: Role }
  ) {
    return this.usersService.update(id, { role: dto.role });
  }
}
