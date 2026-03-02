import {
  Column,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Pr } from 'src/modules/pr/entity/pr.entity';
import { PattyCash } from 'src/modules/pattycash/entity/pattycash.entity';

export type JobStatus = 'in_progress' | 'completed';

@Entity('jobs')
export class Job {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'jobName' })
  jobName: string;

  @Column({ default: '' })
  projectCode: string;

  @Column({ default: '' })
  jobNo: string;

  @Column({ nullable: true })
  ccNo: string;

  @Column({ name: 'waNumber', nullable: true })
  waNumber: string;

  @Column({ name: 'wrPoSrRoNumber', nullable: true })
  wrPoSrRoNumber: string;

  @Column({ name: 'contactPerson', nullable: true })
  contactPerson: string;

  @Column({ name: 'contactNumber', nullable: true })
  contactNumber: string;

  @Column({ name: 'contactEmail', nullable: true })
  contactEmail: string;

  @Column({ name: 'traderId', nullable: true })
  traderId: number;

  @Column({ name: 'trader', nullable: true })
  trader: string;

  @Column({ name: 'expteamQuotation', nullable: true })
  expteamQuotation: string;

  @Column({ type: 'float', default: 0 })
  estimatedPrCost: number;

  @Column({ type: 'date', nullable: true })
  startDate: string;

  @Column({ type: 'date', nullable: true })
  endDate: string;

  @Column({ type: 'text', nullable: true })
  remark: string;

  // งบประมาณ
  @Column({ type: 'float', default: 0 })
  budgetMaterial: number;

  @Column({ type: 'float', default: 0 })
  budgetManPower: number;

  @Column({ type: 'float', default: 0 })
  budgetOp: number;

  @Column({ type: 'float', default: 0 })
  budgetIe: number;

  @Column({ type: 'float', default: 0 })
  budgetSupply: number;

  @Column({ type: 'float', default: 0 })
  budgetEngineer: number;

  // สถานะงาน
  @Column({
    type: 'enum',
    enum: ['in_progress', 'completed'],
    default: 'in_progress',
  })
  status: JobStatus;

  // เพิ่มฟิลด์บันทึกร่าง
  @Column({ type: 'boolean', default: false })
  isDraft: boolean;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt?: Date;

  // Approval
  @Column({ default: 'USR001' })
  requesterId: string;

  @Column({ default: 'USR001' })
  originatorId: string;

  @Column({ default: 'ST001' })
  storeId: string;

  @Column({ default: 'USR001' })
  approverId: string;

  @OneToMany(() => Pr, (pr) => pr.job)
  prs: Pr[];

  @OneToMany(() => PattyCash, (pattyCash) => pattyCash.job)
  pattyCashes: PattyCash[];
}