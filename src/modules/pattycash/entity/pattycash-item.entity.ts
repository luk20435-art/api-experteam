import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, DeleteDateColumn } from 'typeorm';
import { PattyCash } from './pattycash.entity';

@Entity('pattycash_items')
export class PattycashItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false }) // ห้าม null เพราะ DB constraint เป็น NOT NULL
  name: string;

  @Column({ nullable: true }) // description เป็น optional ใน DB
  description?: string;

  @Column({ type: 'int', nullable: false })
  quantity: number;

  @Column({ nullable: true })
  unit?: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  unitPrice?: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalPrice: number;

  @Column()
  pattyCashId: number;

  @ManyToOne(() => PattyCash, (pattyCash) => pattyCash.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pattyCashId' })
  pattycash: PattyCash;

  @DeleteDateColumn({ nullable: true })
  deletedAt?: Date;
}