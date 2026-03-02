import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from './entity/department.entity';
import { CreateDepartmentDto } from './dto/create-department.dto';

@Injectable()
export class DepartmentService {
  constructor(
    @InjectRepository(Department)
    private departmentRepository: Repository<Department>,
  ) {}

  async create(dto: CreateDepartmentDto): Promise<Department> {
    const department = this.departmentRepository.create({
      ...dto,
      departCode: `DEP-${Date.now()}`,
    });
    return this.departmentRepository.save(department);
  }

  async findAll(): Promise<Department[]> {
    return this.departmentRepository.find({
      order: { id: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Department> {
    const department = await this.departmentRepository.findOne({ where: { id } });
    if (!department) throw new NotFoundException('Department ไม่พบ');
    return department;
  }

  async update(id: number, dto: Partial<CreateDepartmentDto>): Promise<Department> {
    await this.departmentRepository.update(id, dto);
    return this.findOne(id);
  }

  async softDelete(id: number): Promise<void> {
    await this.departmentRepository.update(id, { isActive: false });
  }
}