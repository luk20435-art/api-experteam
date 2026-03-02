import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  JoinColumn,
} from 'typeorm';
import { Job } from 'src/modules/job/entity/job.entity';
import { PattycashItem } from './pattycash-item.entity';
import { PattycashApproval } from './pattycash-approvals.entity';
import { Depart } from 'src/modules/depart/entity/depart.entity';
import { PattycashFile } from './pattycash-file.entity';

export enum PattycashStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  REVISED = 'revised',
  SUBMITTED = 'submitted',
}

@Entity('pattycash')
export class PattyCash {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', unique: true })
  pattycashNumber: string;

  @Column()
  requester: string;

  @Column({ type: 'boolean', nullable: true, default: false })
  extraCharge?: boolean;

  @Column({ type: 'text', default: '' })
  jobNote: string;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  requestDate: string;

  @Column({ type: 'date', nullable: true })
  requiredDate?: string;

  @Column({ type: 'int', nullable: true })
  duration?: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  jobBalance: number;

  @Column({ nullable: true })
  supplier?: string;

  @Column({ name: 'supplierId', nullable: true })
  supplierId?: number;

  @Column({ nullable: true })
  depart?: string; // เก็บชื่อ (Legacy)

  @Column({ name: 'departId', nullable: true })
  departId?: number; // เก็บ ID (Frontend ส่ง department มา map เข้าอันนี้)

  @Column({ nullable: true })
  deliveryLocation?: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 7 })
  vatPercent: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  discountPercent: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  grandTotal: number;

  @Column({ type: 'enum', enum: PattycashStatus, default: PattycashStatus.DRAFT })
  status: PattycashStatus;

  @Column({ nullable: true })
  quoteNo: string;

  @Column({ default: '30 Days' })
  paymentTerms: string;

  @Column({ default: '30 Days' })
  deliveryTerms: string;

  @Column({ nullable: true })
  signatureImage: string;

  @Column({ default: 3 })
  withholdingPercent: number;

  @Column({ nullable: true })
  remark?: string;

  @Column({ nullable: true }) // เปลี่ยนเป็น nullable ถ้าบางรายการไม่มี Job
  jobId?: number;

  @ManyToOne(() => Job, (job) => job.pattyCashes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'jobId' }) // ระบุให้ชัดเจนว่าสัมพันธ์กับ Column นี้
  job: Job;

  @OneToMany(() => PattycashItem, (item) => item.pattycash, { cascade: true })
  items: PattycashItem[];

  @OneToMany(() => PattycashFile, (file) => file.pattycash, { cascade: true })
  files: PattycashFile[];

  @OneToMany(() => PattycashApproval, (approval) => approval.pattycash, { cascade: true })
  approvals: PattycashApproval[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt?: Date;
}
