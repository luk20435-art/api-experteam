import { Module } from '@nestjs/common';
import { RunningService } from './running.service';

@Module({
  providers: [RunningService],
  exports: [RunningService], // export เพื่อให้ module อื่นใช้งานได้
})
export class UtilsModule {}
