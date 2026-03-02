// src/modules/wo/entity/wo.entity.ts

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { Wr } from '../../wr/entity/wr.entity';
import { WoItem } from './wo-item.entity';
import { WoApproval } from './wo-approval.entity';
import { Job } from 'src/modules/job/entity/job.entity';
import { WoAttachment } from './wo-attachment.entity';

export enum WOStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('wo')
export class Wo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  woNumber: string;

  @Column({ nullable: true })
  wrId?: number;

  @ManyToOne(() => Wr, { nullable: true })
  wr?: Wr;

  @Column({ type: 'timestamp', nullable: true })
  orderDate?: Date;

  @Column({ type: 'timestamp', nullable: true })
  deliveryDate?: Date;

  @Column({ nullable: true })
  deliveryLocation?: string;

  @Column({ nullable: true })
  requester?: string;

  @Column({ nullable: true })
  departId?: number;

  @Column({ nullable: true })
  depart?: string;

  @Column({ nullable: true })
  supplier?: string;

  @Column({ nullable: true })
  supplierId?: number;

  @Column({ nullable: true })
  remark?: string;

  @Column({ nullable: true })
  paymentTerms?: string;

  @Column({ nullable: true })
  signatureImage: string;

  @Column({ default: 3 })
  withholdingPercent: number;

  @Column({ type: 'varchar', length: 10, default: 'THB' })
  currency: string = 'THB';

  @Column({ nullable: true })
  planType: string; // เพิ่ม: เพื่อรับค่า 'PLAN' หรือ 'UNPLAN'

  @Column({ nullable: true })
  paymentMethod: string; // เพิ่ม: เพื่อรับค่า 'cash' หรือ 'credit'

  @Column({ nullable: true })
  tax: string; /*  */

  @Column({ type: 'enum', enum: WOStatus, default: WOStatus.PENDING })
  status: WOStatus;

  @OneToMany(() => WoItem, (item) => item.wo, { cascade: true })
  items: WoItem[];

  @OneToMany(() => WoApproval, (approval) => approval.wo, { cascade: true })
  approvals: WoApproval[];

  @OneToMany(() => WoAttachment, (attachment) => attachment.wo, { cascade: true })
  attachments: WoAttachment[];

  @ManyToOne(() => Job, { nullable: true })
  job?: Job;

  @Column({ type: 'date', nullable: true })
  requestDate?: Date;

  @Column({ type: 'date', nullable: true })
  requiredDate?: Date;

  @Column({ nullable: true })
  jobId?: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt?: Date;
}
