import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Depart } from './entity/depart.entity';
import { CreateDepartDto } from './dto/create-depart.dto';

@Injectable()
export class DepartService {
  constructor(
    @InjectRepository(Depart)
    private departRepository: Repository<Depart>,
  ) {}

  async create(dto: CreateDepartDto): Promise<Depart> {
    const depart = this.departRepository.create({
      ...dto,
      departCode: `DEP-${Date.now()}`,
    });
    return this.departRepository.save(depart);
  }

  async findAll(): Promise<Depart[]> {
    return this.departRepository.find({
      order: { id: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Depart> {
    const depart = await this.departRepository.findOne({ where: { id } });
    if (!depart) throw new NotFoundException('Depart ไม่พบ');
    return depart;
  }

  async update(id: number, dto: Partial<CreateDepartDto>): Promise<Depart> {
    await this.departRepository.update(id, dto);
    return this.findOne(id);
  }

  async softDelete(id: number): Promise<void> {
    await this.departRepository.update(id, { isActive: false });
  }
}