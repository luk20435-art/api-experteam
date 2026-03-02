import { Entity, Column, ManyToOne, OneToMany, PrimaryGeneratedColumn, DeleteDateColumn, JoinColumn } from 'typeorm';
import { PaymentMethod, Pr } from '../../pr/entity/pr.entity';
import { PoItem } from './po-item.entity';
import { PoApproval } from './po-approvals.entity';
import { PoAttachment } from './po-attachment.entity';
import { Exclude } from 'class-transformer';
import { Job } from 'src/modules/job/entity/job.entity';
import { IsNumber, IsOptional, Min, ValidateIf } from 'class-validator';

export enum PoStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SUBMITTED = 'submitted',
}

@Entity('po')
export class Po {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'varchar', length: 20, unique: true })
  poNumber: string;

  @Column({ type: 'date' })
  orderDate: Date;

  @Column({ type: 'date', nullable: true })
  deliveryDate?: Date;

  @Column({ type: 'text', nullable: true })
  remark?: string;

  @Column({ type: 'enum', enum: PaymentMethod, default: PaymentMethod.CASH })
  paymentMethod: PaymentMethod;

  @IsOptional() // ปกติ optional
  @IsNumber()
  @Min(1, { message: 'Payment Term ต้องมากกว่า 0 วัน' })
  @ValidateIf(o => o.paymentMethod === PaymentMethod.CREDIT) // บังคับเฉพาะ credit
  paymentTerm?: number;

  @Column({ nullable: true })
  signatureImage: string;

  @Column({ default: 3 })
  withholdingPercent: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 7 })
  vatPercent: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  discountPercent: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  grandTotal: number;

  @Column({ type: 'varchar', length: 10, nullable: true })
  currency?: string;

  @Column({ type: 'enum', enum: PoStatus, default: PoStatus.DRAFT })
  status: PoStatus;

  @ManyToOne(() => Pr, { nullable: true })
  @JoinColumn({ name: 'prId' })
  pr?: Pr;

  @Column({ nullable: true })
  prId?: number;

  // ✅ เพิ่ม field จาก PR (nullable ทั้งหมดเพื่อไม่ error เมื่อมีข้อมูลเดิม)
  @Column({ nullable: true })
  jobId?: number;

  @ManyToOne(() => Job, { nullable: true })
  job?: Job;

  @Column({ nullable: true })
  requester?: string;

  @Column({ type: 'boolean', nullable: true, default: false })
  extraCharge?: boolean;

  @Column({ type: 'text', default: '' })
  jobNote: string;

  @Column({ nullable: true })
  departId?: number;

  @Column({ nullable: true })
  depart?: string;

  @Column({ type: 'varchar', nullable: true })
  requestDate?: string;

  @Column({ type: 'varchar', nullable: true })
  requiredDate?: string;

  @Column({ nullable: true })
  supplier?: string;

  @Column({ nullable: true })
  supplierId?: number;

  @Column({ nullable: true })
  deliveryLocation?: string;

  @Column({ nullable: true })
  invoice?: string;

  @Column({ nullable: true })
  tax?: string;

  @OneToMany(() => PoItem, (item) => item.po, { cascade: true })
  items: PoItem[];

  @Exclude({ toPlainOnly: true })
  @OneToMany(() => PoApproval, (approval) => approval.po, { cascade: true })
  approvals: PoApproval[];

  @OneToMany(() => PoAttachment, (attachment) => attachment.po, { cascade: true })
  attachments: PoAttachment[];

  @DeleteDateColumn({ nullable: true })
  deletedAt?: Date;
}
