import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WrController } from './wr.controller';
import { WrService } from './wr.service';
import { Wr } from './entity/wr.entity';
import { WrItem } from './entity/wr-item.entity';
import { WrApproval } from './entity/wr-approval.entity';
import { WrAttachment } from './entity/wr-attachment.entity';
import { Job } from '../job/entity/job.entity';
import { Supplier } from '../supplier/entity/supplier.entity';
import { Depart } from '../depart/entity/depart.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Wr, WrItem, WrApproval, WrAttachment, Job, Supplier, Depart]),
  ],
  controllers: [WrController],
  providers: [WrService],
  exports: [WrService],
})
export class WrModule {}
