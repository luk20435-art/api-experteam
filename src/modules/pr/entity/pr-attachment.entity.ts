import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Pr } from './pr.entity';

@Entity('pr_attachments')
export class PrAttachment {
    @PrimaryGeneratedColumn() // ✅ 1. ต้องมี ID เสมอ
    id: number;

    @Column()
    fileName: string;

    @Column()
    originalFileName: string;

    @Column()
    filePath: string;

    @Column()
    mimeType: string;

    @Column()
    fileSize: number;

    @Column()
    uploadedAt: Date; // ✅ เพิ่ม field นี้ด้วยเพราะใน Service มีการใช้

    // ✅ 2. แก้ Relation: (pr) => pr.attachments (ไม่ใช่ pr.items)
    // คุณต้องไปเพิ่ม field `attachments` ในไฟล์ pr.entity.ts ด้วยนะครับ
    @ManyToOne(() => Pr, (pr) => pr.attachments, { onDelete: 'CASCADE' }) 
    @JoinColumn({ name: 'prId' })
    pr: Pr;

    @Column({ nullable: true })
    prId: number;
}