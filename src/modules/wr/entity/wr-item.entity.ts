import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Wr } from './wr.entity';
import { IsString } from 'class-validator';

@Entity('wr_items')
export class WrItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  description: string;

  @IsString()
  name: string;

  @Column('int')
  quantity: number;

  @Column({ nullable: true })
  unit?: string;

  @Column('decimal', { precision: 12, scale: 2, nullable: true })
  unitPrice?: number;

  @Column('decimal', { precision: 14, scale: 2, nullable: true, default: 0 })
  totalPrice?: number;

  @ManyToOne(() => Wr, (wr) => wr.items, { nullable: false })
  wr: Wr;

  @Column({ select: false })
  wrId: string;
}