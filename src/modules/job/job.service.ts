import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not, Like } from 'typeorm';
import { Job } from './entity/job.entity';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { Trader } from '../trader/entity/trader.entity';

@Injectable()
export class JobService {
  constructor(
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,

    @InjectRepository(Trader)
    private readonly traderRepo: Repository<Trader>,
  ) {}

  async create(dto: CreateJobDto): Promise<Job> {
    const now = new Date();
    const yearAD = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const yearShort = String(yearAD).slice(-2);

    const lastProject = await this.jobRepo.findOne({
      where: { projectCode: Like(`%/${yearShort}`) },
      order: { id: 'DESC' },
    });

    let projectSeq = 1;
    if (lastProject?.projectCode) {
      const match = lastProject.projectCode.match(/^(\d{4})/);
      if (match) projectSeq = parseInt(match[1], 10) + 1;
    }
    dto.projectCode = `${String(projectSeq).padStart(4, '0')}-00/${yearShort}`;

    const yearJobNos = await this.jobRepo.find({
      where: { jobNo: Like(`ON/%/${yearAD}`) },
      select: { jobNo: true },
      order: { id: 'DESC' },
    });

    const maxSeqInYear = yearJobNos.reduce((max, row) => {
      const match = row.jobNo?.match(/^ON\/(\d{3})-\d{2}\/\d{4}$/);
      if (!match) return max;
      const seq = parseInt(match[1], 10);
      return seq > max ? seq : max;
    }, 0);

    const jobSeq = maxSeqInYear + 1;
    dto.jobNo = `ON/${String(jobSeq).padStart(3, '0')}-${month}/${yearAD}`;

    const lastCc = await this.jobRepo.findOne({
      where: { ccNo: Like(`ON/%/${yearShort}`) },
      order: { id: 'DESC' },
    });

    let ccSeq = 1;
    if (lastCc?.ccNo) {
      const match = lastCc.ccNo.match(/ON\/(\d{3})/);
      if (match) ccSeq = parseInt(match[1], 10) + 1;
    }
    dto.ccNo = `ON/${String(ccSeq).padStart(3, '0')}-00/${yearShort}`;

    if (dto.traderId !== null && dto.traderId !== undefined) {
      const trader = await this.traderRepo.findOneBy({ id: dto.traderId });
      if (!trader) {
        throw new BadRequestException('ไม่พบ Trader ที่ระบุ (traderId ผิด)');
      }
      dto.trader = trader.name;
    }

    const jobEntity = this.jobRepo.create({
      ...dto,
      isDraft: dto.isDraft ?? false,
      status: dto.isDraft ? 'in_progress' : (dto.status || 'in_progress'),
      traderId: dto.traderId ?? undefined,
    } as Job);

    await this.jobRepo.save(jobEntity);
    return jobEntity;
  }

  async findAll(): Promise<Job[]> {
    return this.jobRepo.find({
      where: { deletedAt: IsNull() },
      relations: ['prs'],
      order: { id: 'DESC' },
    });
  }

  async findTrashed(): Promise<Job[]> {
    return this.jobRepo.find({
      where: { deletedAt: Not(IsNull()) },
      relations: ['prs'],
      withDeleted: true,
      order: { deletedAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Job> {
    const job = await this.jobRepo.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['prs'],
    });
    if (!job) throw new NotFoundException('ไม่พบข้อมูล Job');
    return job;
  }

  // ✅ แก้ตรงนี้: อัปเดต status เสมอเมื่อมีค่า
  async update(id: number, dto: UpdateJobDto): Promise<Job> {
    const job = await this.findOne(id);

    if (dto.traderId !== null && dto.traderId !== undefined) {
      const trader = await this.traderRepo.findOneBy({ id: dto.traderId });
      if (!trader) throw new BadRequestException('ไม่พบ Trader');
      dto.trader = trader.name;
    }

    Object.assign(job, {
      ...dto,
      traderId: dto.traderId ?? job.traderId,
      // อัปเดต status เสมอถ้ามีค่าใน dto
      status: dto.status !== undefined ? dto.status : job.status,
      // ถ้าต้องการ logic isDraft → status ให้คงไว้
      // isDraft: dto.isDraft !== undefined ? dto.isDraft : job.isDraft,
    });

    await this.jobRepo.save(job);
    return job;
  }

  async softDelete(id: number): Promise<void> {
    const result = await this.jobRepo.softDelete(id);
    if (result.affected === 0) {
      throw new NotFoundException('ไม่พบ Job หรือถูกลบไปแล้ว');
    }
  }

  async restore(id: number): Promise<Job> {
    const result = await this.jobRepo.restore(id);
    if (result.affected === 0) {
      throw new NotFoundException('ไม่พบ Job ในถังขยะ');
    }
    return this.findOne(id);
  }

  async forceDelete(id: number): Promise<void> {
    const result = await this.jobRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('ไม่พบ Job');
    }
  }
}
