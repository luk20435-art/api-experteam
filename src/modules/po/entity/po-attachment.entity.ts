import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Po } from './po.entity';

@Entity('po_attachments')
export class PoAttachment {
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

  @ManyToOne(() => Po, (po) => po.attachments, { onDelete: 'CASCADE' })
  po: Po;
}

