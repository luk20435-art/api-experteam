import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TraderController } from './trader.controller';
import { TraderService } from './trader.service';
import { Trader } from './entity/trader.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Trader])],
  controllers: [TraderController],
  providers: [TraderService],
  exports: [TraderService],
})
export class TraderModule {}