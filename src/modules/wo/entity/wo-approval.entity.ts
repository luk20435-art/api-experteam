import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Wo } from './wo.entity';

export enum WoApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('wo_approvals')
export class WoApproval {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  approverEmail: string;

  @Column({ type: 'enum', enum: WoApprovalStatus, default: WoApprovalStatus.PENDING })
  status: WoApprovalStatus;

  @Column({ type: 'text', nullable: true })
  comment?: string;

  @CreateDateColumn()
  actionDate: Date;

  @ManyToOne(() => Wo, (wo) => wo.approvals, { nullable: false })
  wo: Wo;

  @Column({ select: false })
  woId: number;
}