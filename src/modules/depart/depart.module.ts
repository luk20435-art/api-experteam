import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DepartController } from './depart.controller';
import { DepartService } from './depart.service';
import { Depart } from './entity/depart.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Depart])],
  controllers: [DepartController],
  providers: [DepartService],
  exports: [DepartService],
})
export class DepartModule {}