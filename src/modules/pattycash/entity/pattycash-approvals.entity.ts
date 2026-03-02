import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { PattyCash } from './pattycash.entity';

export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity('pattycash_approvals')
export class PattycashApproval {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  approverEmail: string;

  @Column({ nullable: true })
  comment?: string;

  @Column({ type: 'enum', enum: ApprovalStatus, default: ApprovalStatus.PENDING })
  status: ApprovalStatus;

  @Column({ nullable: true })
  signatureImage?: string;

  @Column({ nullable: true })
  remark?: string;

  @ManyToOne(() => PattyCash, (pattycash) => pattycash.approvals, { onDelete: 'CASCADE' })
  pattycash: PattyCash;

  @Column()
  pattyCashId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt?: Date;
}
