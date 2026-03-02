// src/modules/depart/entity/depart.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { PattyCash } from 'src/modules/pattycash/entity/pattycash.entity';
import { Pr } from 'src/modules/pr/entity/pr.entity';
import { Wr } from 'src/modules/wr/entity/wr.entity';

@Entity('departs')
export class Depart {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'depart_code', unique: true })
  departCode: string;

  @Column({ name: 'depart_name', nullable: false })
  departName: string;

  @Column({ nullable: true })
  supervisor?: string;

  @Column({ nullable: true })
  manager?: string;

  @Column({ nullable: true })
  storeman?: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => PattyCash, (pattyCash) => pattyCash.depart)
  pattyCashes: PattyCash[];

  @OneToMany(() => Pr, (pr) => pr.depart)
  prs: Pr[];

  @OneToMany(() => Wr, (wr) => wr.depart  )
  wrs: Wr[];

  @OneToMany(() => PattyCash, (pattyCash) => pattyCash.depart)
  pattyCashe: PattyCash[];
}
