import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Pr } from './pr.entity';
import { IsString } from 'class-validator';

@Entity('pr_items')
export class PrItem {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ nullable: false })
  description: string;

  @IsString()
  name: string;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ nullable: true })
  unit?: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 }) 
  unitPrice?: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 }) 
  totalPrice: number;

  // Relation
  @ManyToOne(() => Pr, (pr) => pr.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'prId' })
  pr: Pr;

  @Column()
  prId: number;
}