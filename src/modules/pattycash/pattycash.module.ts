import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Job } from '../job/entity/job.entity';
import { Supplier } from '../supplier/entity/supplier.entity';
import { PattyCash } from './entity/pattycash.entity';
import { PattycashApproval } from './entity/pattycash-approvals.entity';
import { PattycashController } from './pattycash.controller';
import { PattycashService } from './pattycash.service';
import { PattycashItem } from './entity/pattycash-item.entity';
import { Depart } from '../depart/entity/depart.entity';
import { PattycashFile } from './entity/pattycash-file.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PattyCash, PattycashItem, PattycashApproval, Job, Supplier, Depart, PattycashFile]),
  ],
  controllers: [PattycashController],
  providers: [PattycashService],
  exports: [PattycashService],
})
export class PattycashModule {}
