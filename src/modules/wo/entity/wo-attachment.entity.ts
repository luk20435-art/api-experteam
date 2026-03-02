import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Wo } from './wo.entity';

@Entity('wo_attachments')
export class WoAttachment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  fileName: string;

  @Column()
  originalFileName: string;

  @Column()
  filePath: string;

  @Column()
  mimeType: string;

  @Column({ type: 'bigint' })
  fileSize: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  uploadedAt: Date;

  @ManyToOne(() => Wo, (wo) => wo.attachments, { onDelete: 'CASCADE' })
  wo: Wo;
}

