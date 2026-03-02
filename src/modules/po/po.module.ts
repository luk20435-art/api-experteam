import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Po } from './entity/po.entity';
import { PoItem } from './entity/po-item.entity';
import { PoService } from './po.service';
import { PoController } from './po.controller';
import { PoApproval } from './entity/po-approvals.entity';
import { Pr } from '../pr/entity/pr.entity';
import { PoAttachment } from './entity/po-attachment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Po, PoItem, PoApproval, PoAttachment, Pr])],
  providers: [PoService],
  controllers: [PoController],
})
export class PoModule {}
