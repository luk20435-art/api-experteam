// src/modules/pr/entity/pr-approvals.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Pr } from './pr.entity';

export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity('pr_approval')
export class PrApproval {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  approverEmail: string;

  @Column({
    type: 'enum',
    enum: ApprovalStatus,
    default: ApprovalStatus.PENDING,
  })
  status: ApprovalStatus;

  @Column({ nullable: true })
  comment?: string;

  @Column({ type: 'timestamp', nullable: true })
  actionDate?: Date;

  @Column({ nullable: true }) 
  signatureImage: string;

  @Column()
  prId: number;

  @ManyToOne(() => Pr, (pr) => pr.approvals, { onDelete: 'CASCADE' })
  pr: Pr;
}