import { Entity, Column, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Po } from './po.entity';

export enum PoApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('po_approval')
export class PoApproval {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column()
  approverEmail: string;

  @Column({ type: 'enum', enum: PoApprovalStatus, default: PoApprovalStatus.PENDING })
  status: PoApprovalStatus;

  @Column({ nullable: true, type: 'text' })
  comment?: string;

  @Column({ type: 'timestamptz', nullable: true })
  actionDate?: Date;

  @ManyToOne(() => Po, (po) => po.approvals, { nullable: false })
  po: Po;

  @Column()
  poId: number;
}
