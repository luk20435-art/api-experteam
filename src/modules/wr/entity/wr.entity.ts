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
import { Job } from '../../job/entity/job.entity';
import { WrItem } from './wr-item.entity';
import { WrApproval } from './wr-approval.entity';
import { WrAttachment } from './wr-attachment.entity';
import { Depart } from '../../depart/entity/depart.entity';

export enum WrStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('wr')
export class Wr {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ unique: true })
  wrNumber: string;

  @ManyToOne(() => Job, { nullable: true })
  job?: Job;

  @Column({ nullable: true })
  jobId?: number;

  @Column()
  requester: string;

  @Column({ type: 'boolean', nullable: true, default: false })
  extraCharge?: boolean;

  @Column({ type: 'text', default: '' })
  jobNote: string;

  @Column({ nullable: true })
  supplierId?: number;

  @Column({ nullable: true })
  supplier?: string;

  @Column({ nullable: true })
  companyName?: string;


  @Column({ name: 'departId', nullable: true })
  departId?: number; // เก็บ ID (Frontend ส่ง department มา map เข้าอันนี้)

  @Column({ nullable: true })
  departName?: string;

  @ManyToOne(() => Depart, { nullable: true })
  depart?: Depart;

  @Column({ type: 'enum', enum: WrStatus, default: WrStatus.DRAFT })
  status: WrStatus;

  @OneToMany(() => WrItem, (item) => item.wr, { cascade: true })
  items: WrItem[];

  @OneToMany(() => WrApproval, (approval) => approval.wr, { cascade: true })
  approvals: WrApproval[];

  @OneToMany(() => WrAttachment, (attachment) => attachment.wr, { cascade: true })
  attachments: WrAttachment[];

  @Column({ type: 'date', nullable: true })
  requestDate?: Date;

  @Column({ type: 'date', nullable: true })
  requiredDate?: Date;

  @Column({ nullable: true })
  deliveryLocation?: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 7 })
  vatPercent: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  discountPercent: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  grandTotal: number;

  @Column({ nullable: true })
  signatureImage: string;

  @Column({ default: 3 })
  withholdingPercent: number;

  @Column({ nullable: true })
  remark?: string;

  @Column({ nullable: true })
  paymentTerms?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt?: Date;
}
