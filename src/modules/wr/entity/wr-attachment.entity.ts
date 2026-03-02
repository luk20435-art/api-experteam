import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Wr } from './wr.entity';

@Entity('wr_attachments')
export class WrAttachment {
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

  @ManyToOne(() => Wr, (wr) => wr.attachments, { onDelete: 'CASCADE' })
  wr: Wr;
}

