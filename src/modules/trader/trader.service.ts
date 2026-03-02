import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Trader } from './entity/trader.entity';
import { CreateTraderDto } from './dto/create-trader.dto';

@Injectable()
export class TraderService {
  constructor(
    @InjectRepository(Trader)
    private traderRepository: Repository<Trader>,
  ) {}

  async create(dto: CreateTraderDto): Promise<Trader> {
    const trader = this.traderRepository.create({
      ...dto,
      traderCode: `TR-${Date.now()}`,
    });
    return this.traderRepository.save(trader);
  }

  async findAll(): Promise<Trader[]> {
    return this.traderRepository.find({
      order: { id: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Trader> {
    const trader = await this.traderRepository.findOne({ where: { id } });
    if (!trader) throw new NotFoundException('Trader ไม่พบ');
    return trader;
  }

  async update(id: number, dto: Partial<CreateTraderDto>): Promise<Trader> {
    await this.traderRepository.update(id, dto);
    return this.findOne(id);
  }

  async softDelete(id: number): Promise<void> {
    await this.traderRepository.update(id, { isActive: false });
  }
}