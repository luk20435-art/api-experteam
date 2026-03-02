// src/modules/pr/pr.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrService } from './pr.service';
import { PrController } from './pr.controller';
import { Pr } from './entity/pr.entity';
import { PrItem } from './entity/pr-item.entity';
import { PrApproval } from './entity/pr-approvals.entity';
import { Job } from '../job/entity/job.entity';
import { Supplier } from '../supplier/entity/supplier.entity';
import { Depart } from '../depart/entity/depart.entity';
import { PrAttachment } from './entity/pr-attachment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Pr, PrItem, PrApproval, Job, Supplier, Depart, PrAttachment]),
  ],
  controllers: [PrController],
  providers: [PrService],
  exports: [PrService],
})
export class PrModule {}