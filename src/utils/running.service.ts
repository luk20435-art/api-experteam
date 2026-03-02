import { Injectable } from '@nestjs/common';

@Injectable()
export class RunningService {
  private counters: Record<string, number> = {};

  async gen(prefix: string): Promise<string> {
    if (!this.counters[prefix]) this.counters[prefix] = 1;
    else this.counters[prefix]++;
    const year = new Date().getFullYear();
    return `${prefix}-${year}${String(this.counters[prefix]).padStart(5, '0')}`;
  }
}
