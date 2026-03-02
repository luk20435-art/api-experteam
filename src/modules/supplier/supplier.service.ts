import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Supplier } from './entity/supplier.entity';
import { CreateSupplierDto } from './dto/create-supplier.dto';

@Injectable()
export class SupplierService {
  constructor(
    @InjectRepository(Supplier)
    private supplierRepository: Repository<Supplier>,
  ) {}

  async create(dto: CreateSupplierDto): Promise<Supplier> {
    const supplier = this.supplierRepository.create({
      ...dto,
      supplierCode: `SUP-${Date.now()}`,
    });
    return this.supplierRepository.save(supplier);
  }

  async findAll(): Promise<Supplier[]> {
    return this.supplierRepository.find({
      order: { id: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Supplier> {
    const supplier = await this.supplierRepository.findOne({ where: { id } });
    if (!supplier) throw new NotFoundException('Supplier ไม่พบ');
    return supplier;
  }

  async update(id: number, dto: Partial<CreateSupplierDto>): Promise<Supplier> {
    await this.supplierRepository.update(id, dto);
    return this.findOne(id);
  }

  async softDelete(id: number): Promise<void> {
    await this.supplierRepository.update(id, { isActive: false });
  }
}