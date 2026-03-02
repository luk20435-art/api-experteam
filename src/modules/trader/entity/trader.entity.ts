import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('traders')
export class Trader {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ unique: true })
  traderCode: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  contactPerson?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  address?: string;

  @Column({ nullable: true })
  city?: string;

  @Column({ nullable: true })
  taxId?: string;

  @Column({ nullable: true })
  registrationDate?: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}