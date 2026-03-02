import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WoController } from './wo.controller';
import { WoService } from './wo.service';
import { Wo } from './entity/wo.entity';
import { WoItem } from './entity/wo-item.entity';
import { WoApproval } from './entity/wo-approval.entity';
import { WoAttachment } from './entity/wo-attachment.entity';
import { Wr } from '../wr/entity/wr.entity';
import { Job } from '../job/entity/job.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Wo,
      WoItem,
      WoApproval,
      WoAttachment,
      Wr,
      Job,
    ]),
  ],
  controllers: [WoController],
  providers: [WoService],
  exports: [WoService],
})
export class WoModule {}
