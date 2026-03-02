import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Wr } from './wr.entity';

export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('wr_approvals')
export class WrApproval {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  approverEmail: string;

  @Column({ type: 'enum', enum: ApprovalStatus, default: ApprovalStatus.PENDING })
  status: ApprovalStatus;

  @Column({ nullable: true }) 
  signatureImage: string;

  @Column({ type: 'text', nullable: true })
  comment?: string;

  @CreateDateColumn()
  actionDate: Date;

  @ManyToOne(() => Wr, (wr) => wr.approvals, { nullable: false })
  wr: Wr;

  @Column({ select: false })
  wrId: string;
}