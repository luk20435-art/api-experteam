import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
} from 'typeorm';
import { Wo } from './wo.entity';

@Entity('wo_items')
export class WoItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  description: string;

  @Column('int')
  quantity: number;

  @Column({ nullable: true })
  unit?: string;

  @Column('decimal', { precision: 12, scale: 2, nullable: true })
  unitPrice?: number;

  @Column('decimal', { precision: 14, scale: 2, default: 0 })
  totalPrice?: number;

  @ManyToOne(() => Wo, (wo) => wo.items, { nullable: false })
  wo: Wo;

  @Column({ select: false })
  woId: number;
}