import { PattyCash } from 'src/modules/pattycash/entity/pattycash.entity';
import { Pr } from 'src/modules/pr/entity/pr.entity';
import { Wr } from 'src/modules/wr/entity/wr.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';

@Entity('departments')
export class Department {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  departmentNumber: string;

  @Column({ unique: true })
  departCode: string

  @Column()
  departmentName: string;
  

  @Column({ nullable: true })
  contactName?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  address?: string;

  @Column({ nullable: true })
  taxId?: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}