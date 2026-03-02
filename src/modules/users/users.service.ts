// src/modules/users/users.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entity/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { Role } from '../../common/enum/role.enum';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) { }

  async createWithHashedPassword(dto: CreateUserDto): Promise<User> {
    const emailExists = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (emailExists) {
      throw new BadRequestException('อีเมลนี้ถูกใช้งานแล้ว');
    }

    const usernameExists = await this.userRepository.findOne({
      where: { username: dto.username },
    });
    if (usernameExists) {
      throw new BadRequestException('Username นี้ถูกใช้งานแล้ว');
    }

    const hashed = await bcrypt.hash(dto.password, 10);

    const user = this.userRepository.create({
      ...dto,
      password: hashed,
      role: dto.role as Role,
    });

    return this.userRepository.save(user); // ✅ คืน entity เต็ม
  }

  async findAll() {
    return this.userRepository.find({
      select: [
        'id',
        'email',
        'username',
        'firstName',
        'lastName',
        'role',
        'isActive',
        'createdAt',
        'updatedAt',
      ],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('ไม่พบผู้ใช้');
    }

    const { password, ...result } = user;
    return result;
  }

  async findByEmail(email: string) {
    return this.userRepository.findOne({
      where: { email },
      select: [
        'id',
        'email',
        'password',
        'username',
        'firstName',
        'lastName',
        'role',
        'isActive',
        'createdAt',
        'updatedAt',
      ],
    });
  }

  async findById(id: string | number): Promise<User | null> {
    const numericId = typeof id === 'string' ? parseInt(id, 10) : id;

    if (isNaN(numericId)) {
      return null; // หรือ throw new Error('Invalid user ID') ตามต้องการ
    }

    return this.userRepository.findOneBy({ id: numericId });
  }

  async findByUsername(username: string) {
    return this.userRepository.findOne({
      where: { username },
      select: [
        'id',
        'email',
        'username',
        'firstName',
        'lastName',
        'role',
        'isActive',
        'createdAt',
        'updatedAt',
      ],
    });
  }

  // ===========================
  // อัปเดตข้อมูลผู้ใช้
  // ===========================
  async update(id: number, dto: UpdateUserDto) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('ไม่พบผู้ใช้');
    }

    // ถ้ามีการเปลี่ยนรหัสผ่าน ต้อง hash ใหม่
    if (dto.password) {
      dto.password = await bcrypt.hash(dto.password, 10);
    }

    // แปลง role เป็น enum
    if (dto.role) {
      dto.role = dto.role as Role;
    }

    await this.userRepository.update(id, dto);

    return this.findOne(id);
  }

  // ===========================
  // ลบผู้ใช้
  // ===========================
  async remove(id: number) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('ไม่พบผู้ใช้');
    }

    await this.userRepository.delete(id);

    return { message: 'ลบผู้ใช้สำเร็จ' };
  }

  // ===========================
  // อัปเดต Role ผู้ใช้ (Admin เท่านั้น)
  // ===========================
  async updateRole(id: number, newRole: Role) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('ไม่พบผู้ใช้');
    }

    user.role = newRole;
    await this.userRepository.save(user);

    const { password, ...result } = user;
    return result;
  }

  // ===========================
  // เปิดใช้งานผู้ใช้ (Activate)
  // ===========================
  async activate(id: number) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('ไม่พบผู้ใช้');
    }

    user.isActive = true;
    await this.userRepository.save(user);

    const { password, ...result } = user;
    return result;
  }

  // ===========================
  // ปิดใช้งานผู้ใช้ (Deactivate)
  // ===========================
  async deactivate(id: number) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('ไม่พบผู้ใช้');
    }

    user.isActive = false;
    await this.userRepository.save(user);

    const { password, ...result } = user;
    return result;
  }

  // ===========================
  // นับจำนวนผู้ใช้ทั้งหมด
  // ===========================
  async count() {
    return this.userRepository.count();
  }

  // ===========================
  // ค้นหาผู้ใช้ตามชื่อ (firstName หรือ lastName)
  // ===========================
  async searchByName(keyword: string) {
    return this.userRepository
      .createQueryBuilder('user')
      .where('user.firstName ILIKE :keyword', { keyword: `%${keyword}%` })
      .orWhere('user.lastName ILIKE :keyword', { keyword: `%${keyword}%` })
      .select([
        'user.id',
        'user.email',
        'user.username',
        'user.firstName',
        'user.lastName',
        'user.role',
        'user.isActive',
        'user.createdAt',
        'user.updatedAt',
      ])
      .orderBy('user.createdAt', 'DESC')
      .getMany();
  }

  // ===========================
  // ดึงผู้ใช้ตาม Role
  // ===========================
  async findByRole(role: Role) {
    return this.userRepository.find({
      where: { role },
      select: [
        'id',
        'email',
        'username',
        'firstName',
        'lastName',
        'role',
        'isActive',
        'createdAt',
        'updatedAt',
      ],
      order: { createdAt: 'DESC' },
    });
  }

  // ===========================
  // Pagination - ดึงผู้ใช้หลายหน้า
  // ===========================
  async findPaginated(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [users, total] = await this.userRepository.findAndCount({
      select: [
        'id',
        'email',
        'username',
        'firstName',
        'lastName',
        'role',
        'isActive',
        'createdAt',
        'updatedAt',
      ],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data: users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}