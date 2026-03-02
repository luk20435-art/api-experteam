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
import { PrItem } from './pr-item.entity';
import { PrApproval } from './pr-approvals.entity';
import { IsEnum, IsNumber, IsOptional, Min, ValidateIf } from 'class-validator';
import { PrAttachment } from './pr-attachment.entity';

export enum PrStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum PaymentMethod {
  CASH = 'cash',
  CREDIT = 'credit',
}

@Entity('pr')
export class Pr {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, nullable: true }) // แก้เป็น nullable true ชั่วคราวเผื่อตอน create ยังไม่มีเลข
  prNumber: string;

  @Column({ nullable: true })
  requester?: string;  // เพิ่ม ? และ nullable: true

  @Column({ type: 'boolean', nullable: true, default: false })
  extraCharge?: boolean;

  @Column({ type: 'text', default: '' })
  jobNote: string;


  @Column({ type: 'date', nullable: true })
  requestDate: Date;

  @Column({ type: 'date', nullable: true })
  requiredDate?: Date;

  @Column({ type: 'int', nullable: true })
  duration?: number;

  // --- Financials ---

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0, nullable: true })
  jobBalance: number; // ของเดิม

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0, nullable: true })
  jobBalanceCost: number; // ✅ เพิ่มใหม่: ให้ตรงกับ Frontend payload

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0, nullable: true })
  estimatedPrCost: number; // ✅ เพิ่มใหม่: ให้ตรงกับ Frontend payload

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 7 })
  vatPercent: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  discountPercent: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 3 })
  withholdingPercent: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  grandTotal: number;

  // --- Relations / IDs ---

  @Column({ nullable: true })
  supplier?: string; // เก็บชื่อ (Legacy)

  @Column({ name: 'supplierId', nullable: true })
  supplierId?: number; // เก็บ ID

  @Column({ nullable: true })
  depart?: string; // เก็บชื่อ (Legacy)

  @Column({ name: 'departId', nullable: true })
  departId?: number; // เก็บ ID (Frontend ส่ง department มา map เข้าอันนี้)

  @Column({ nullable: true })
  departName?: string;

  @Column()
  jobId: number;

  @ManyToOne(() => Job, (job) => job.prs, { nullable: true })
  @JoinColumn({ name: 'jobId' }) // ⚠️ แก้ name ให้ตรงกับ column jobId เพื่อป้องกัน error
  job?: Job;

  // --- Details & Text Fields ---

  @Column({ nullable: true })
  deliveryLocation?: string;

  @Column({ nullable: true })
  planType: string; // ✅ ตัวนี้ต้องมีใน DB ไม่งั้น Error

  @Column({ nullable: true })
  trader?: string; // ✅ เพิ่มใหม่

  @Column({ nullable: true })
  jobNo?: string; // ✅ เพิ่มใหม่

  @Column({ nullable: true })
  ccNo?: string; // ✅ เพิ่มใหม่

  @Column({ nullable: true })
  expteamQuotation?: string; // ✅ เพิ่มใหม่

  @Column({ nullable: true })
  currency?: string;

  @Column({ nullable: true })
  discountType?: string;

  @Column({ nullable: true })
  discountValue?: string;

  @Column({ nullable: true })
  quoteNo: string;

  @Column({ nullable: true })
  remark?: string;

  @Column({ nullable: true })
  dress?: string; // เผื่อมี

  // --- Status & Payment ---

  @Column({ type: 'enum', enum: PrStatus, default: PrStatus.DRAFT })
  status: PrStatus;

  @Column({ type: 'enum', enum: PaymentMethod, default: PaymentMethod.CASH, nullable: true })
  paymentMethod: PaymentMethod;

  @IsOptional()
  @IsNumber()
  @Min(1, { message: 'Payment Term ต้องมากกว่า 0 วัน' })
  @ValidateIf((o) => o.paymentMethod === PaymentMethod.CREDIT)
  @Column({ nullable: true })
  paymentTerm?: number;

  @Column({ nullable: true })
  paymentTerms?: string; // บางที Frontend ส่งเป็น string text

  @Column({ nullable: true })
  signatureImage: string;

  // --- Children ---

  @OneToMany(() => PrItem, (item) => item.pr, { cascade: true })
  items: PrItem[];

  @OneToMany(() => PrAttachment, (attachment) => attachment.pr, { cascade: true })
  attachments: PrAttachment[];

  @OneToMany(() => PrApproval, (approval) => approval.pr, { cascade: true })
  approvals: PrApproval[];

  // --- Timestamps ---

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt?: Date;
}