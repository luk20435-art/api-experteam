// src/modules/po/entity/po-item.entity.ts

import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Po } from './po.entity';
import { Exclude } from 'class-transformer';

@Entity('po_item')
export class PoItem {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'varchar', length: 20, default: 'ชิ้น' })
  unit: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  unitPrice: number;

  @ManyToOne(() => Po, (po) => po.items, { onDelete: 'CASCADE' })
  @Exclude({ toPlainOnly: true }) // สำคัญมาก: ตัด circular reference
  po: Po;

  @Column({ nullable: true })
  poId?: number;
}