import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { PattyCash } from './pattycash.entity';

@Entity('pattycash_files')
export class PattycashFile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  fileName: string;

  @Column()
  filePath: string; // เก็บ Path หรือ URL

  @Column({ nullable: true })
  fileType: string;

  @Column()
  pattyCashId: number;

  @ManyToOne(() => PattyCash, (pc) => pc.files, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pattyCashId' })
  pattycash: PattyCash;
}