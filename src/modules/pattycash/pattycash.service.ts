import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
    Repository,
    DataSource,
    QueryRunner,
    IsNull,
    EntityManager,
} from 'typeorm';
import { Job } from 'src/modules/job/entity/job.entity';
import { Supplier } from '../supplier/entity/supplier.entity';
import * as puppeteer from 'puppeteer';
import * as ejs from 'ejs';
import { PattyCash, PattycashStatus } from './entity/pattycash.entity';
import { PattycashItem } from './entity/pattycash-item.entity';
import { PattycashApproval, ApprovalStatus } from './entity/pattycash-approvals.entity';
import {
    CreatePattycashDto,
    CreatePattycashItemDto,
    CreateApprovalDto,
} from './dto/create-pattycash.dto';
import { UpdatePattycashDto } from './dto/update-pattycash.dto';
import { Depart } from '../depart/entity/depart.entity';
import { PattycashFile } from './entity/pattycash-file.entity';
import * as fs from 'fs-extra'; // เน€เธโ€ขเน€เธยเน€เธเธเน€เธยเน€เธเธเน€เธเธ•เน€เธยเน€เธเธ“เน€เธเธเน€เธยเน€เธเธ’ -extra
import * as path from 'path';
import bahttext from 'thai-baht-text';

@Injectable()
export class PattycashService {
    constructor(
        @InjectRepository(PattyCash)
        private readonly pattycashRepository: Repository<PattyCash>,
        @InjectRepository(PattycashItem)
        private readonly pattycashItemRepository: Repository<PattycashItem>,
        @InjectRepository(PattycashApproval)
        private readonly pattycashApprovalRepository: Repository<PattycashApproval>,
        @InjectRepository(Job)
        private readonly jobRepository: Repository<Job>,
        @InjectRepository(Supplier)
        private readonly supplierRepository: Repository<Supplier>,
        @InjectRepository(Depart)
        private readonly departRepository: Repository<Depart>,
        @InjectRepository(PattycashFile)
        private readonly pattycashFileRepository: Repository<PattycashFile>,
        private readonly dataSource: DataSource,
    ) { }


    /** Generate new Pattycash Number */
    private async generatePattycashNumber(queryRunner: QueryRunner): Promise<string> {
        const yearShort = String(new Date().getFullYear()).slice(-2);
        const result = await queryRunner.manager.query(
            `
      SELECT "pattycashNumber"
      FROM "pattycash"
      WHERE "pattycashNumber" LIKE $1
      ORDER BY "pattycashNumber" DESC
      LIMIT 1
      FOR UPDATE
      `,
            [`Pattycash%/${yearShort}`],
        );

        let seq = 1;
        if (result.length > 0) {
            const lastNumber: string = result[0].pattycashNumber;
            const match = lastNumber.match(/Pattycash(\d{4})\/(\d{2})/);
            if (match) {
                seq = parseInt(match[1], 10) + 1;
            }
        }

        return `Pattycash${String(seq).padStart(4, '0')}/${yearShort}`;


    }


    /** Find all non-deleted Pattycash */
    async findAll(): Promise<PattyCash[]> {
        return this.pattycashRepository.find({
            where: { deletedAt: IsNull() },
            relations: ['items', 'approvals', 'job'],
            order: { requestDate: 'DESC' },
        });
    }

    /** Find soft-deleted Pattycash */
    async findTrashed(): Promise<PattyCash[]> {
        return this.pattycashRepository.find({
            where: {},
            withDeleted: true,
            order: { deletedAt: 'DESC' },
        });
    }

    /** Find one by ID */
    async findOne(id: number): Promise<PattyCash> {
        const pattyCash = await this.pattycashRepository.findOne({
            where: { id },
            relations: ['items', 'approvals', 'job', 'files'],
        });
        if (!pattyCash) throw new NotFoundException('Pattycash เน€เธยเน€เธเธเน€เธยเน€เธยเน€เธย');
        return pattyCash;
    }

    async addApproval(
        id: number,
        dto: CreateApprovalDto,
    ): Promise<PattycashApproval> {
        const pattyCash = await this.pattycashRepository.findOne({
            where: { id, deletedAt: IsNull() },
            relations: ['approvals'],
        });

        if (!pattyCash) throw new NotFoundException('Pattycash เน€เธยเน€เธเธเน€เธยเน€เธยเน€เธย');
        if (pattyCash.status !== PattycashStatus.DRAFT) {
            throw new BadRequestException('เน€เธเธเน€เธเธ’เน€เธเธเน€เธเธ’เน€เธเธเน€เธโ€“เน€เธโฌเน€เธยเน€เธเธ”เน€เธยเน€เธเธ approver เน€เธยเน€เธโ€เน€เธยเน€เธโฌเน€เธยเน€เธยเน€เธเธ’เน€เธเธ DRAFT');
        }

        const approval = this.pattycashApprovalRepository.create({
            approverEmail: dto.approverEmail,
            comment: dto.comment ?? undefined,          // เน€เธยเน€เธยเน€เธยเน€เธยเน€เธเธ’เน€เธย null เน€เธโฌเน€เธยเน€เธยเน€เธย undefined
            status: dto.status ?? ApprovalStatus.PENDING,
            signatureImage: dto.signatureImage ?? undefined, // เน€เธยเน€เธยเน€เธยเน€เธยเน€เธเธ’เน€เธย null เน€เธโฌเน€เธยเน€เธยเน€เธย undefined
            pattyCashId: pattyCash.id,
        });

        await this.pattycashApprovalRepository.save(approval);

        return approval;
    }

    async approve(id: number): Promise<PattyCash> {
        const pattyCash = await this.pattycashRepository.findOne({
            where: { id, deletedAt: IsNull() },
            relations: ['approvals'],
        });
        if (!pattyCash) throw new NotFoundException('Pattycash เน€เธยเน€เธเธเน€เธยเน€เธยเน€เธย');

        if (pattyCash.status !== PattycashStatus.PENDING) {
            throw new BadRequestException('เน€เธเธเน€เธเธ’เน€เธเธเน€เธเธ’เน€เธเธเน€เธโ€“ approve เน€เธยเน€เธโ€เน€เธยเน€เธโฌเน€เธยเน€เธยเน€เธเธ’เน€เธเธ PENDING');
        }

        // เน€เธโฌเน€เธยเน€เธเธ…เน€เธเธ•เน€เธยเน€เธเธเน€เธย status เน€เธโฌเน€เธยเน€เธยเน€เธย APPROVED
        pattyCash.status = PattycashStatus.APPROVED;
        pattyCash.approvals.forEach(a => {
            if (a.status === ApprovalStatus.PENDING) {
                a.status = ApprovalStatus.APPROVED; // เน€เธยเน€เธยเน€เธย enum
                a.updatedAt = new Date();           // เน€เธยเน€เธยเน€เธย updatedAt เน€เธยเน€เธเธ’เน€เธย entity
            }
        });

        await this.pattycashApprovalRepository.save(pattyCash.approvals);
        return this.pattycashRepository.save(pattyCash);
    }


    async submitForApproval(id: number): Promise<PattyCash> {
        const pattyCash = await this.pattycashRepository.findOne({
            where: { id, deletedAt: IsNull() },
        });
        if (!pattyCash) throw new NotFoundException('Pattycash เน€เธยเน€เธเธเน€เธยเน€เธยเน€เธย');
        if (pattyCash.status !== PattycashStatus.DRAFT) {
            throw new BadRequestException('เน€เธเธเน€เธเธ’เน€เธเธเน€เธเธ’เน€เธเธเน€เธโ€“ submit เน€เธยเน€เธโ€เน€เธยเน€เธโฌเน€เธยเน€เธยเน€เธเธ’เน€เธเธ DRAFT');
        }

        pattyCash.status = PattycashStatus.PENDING;
        return this.pattycashRepository.save(pattyCash);
    }

    async addItem(id: number, dto: CreatePattycashItemDto): Promise<PattycashItem> {
        const pattyCash = await this.pattycashRepository.findOne({
            where: { id, deletedAt: IsNull() },
            relations: ['items'],
        });
        if (!pattyCash) throw new NotFoundException('Pattycash เน€เธยเน€เธเธเน€เธยเน€เธยเน€เธย');
        if (pattyCash.status !== PattycashStatus.DRAFT) {
            throw new BadRequestException('เน€เธเธเน€เธเธ’เน€เธเธเน€เธเธ’เน€เธเธเน€เธโ€“เน€เธโฌเน€เธยเน€เธเธ”เน€เธยเน€เธเธเน€เธเธเน€เธเธ’เน€เธเธเน€เธยเน€เธเธ’เน€เธเธเน€เธยเน€เธโ€เน€เธยเน€เธโฌเน€เธยเน€เธยเน€เธเธ’เน€เธเธ DRAFT');
        }

        const unitPrice = dto.unitPrice ?? 0; // handle undefined
        const totalPrice = dto.quantity * unitPrice;

        const item = this.pattycashItemRepository.create({
            description: dto.description,
            quantity: dto.quantity,
            unit: dto.unit,
            unitPrice: unitPrice,
            totalPrice: totalPrice,
            pattyCashId: pattyCash.id,
        });

        await this.pattycashItemRepository.save(item);

        // เน€เธเธเน€เธเธ‘เน€เธยเน€เธโฌเน€เธโ€เน€เธโ€ข grandTotal เน€เธยเน€เธเธเน€เธย pattyCash
        pattyCash.grandTotal = (pattyCash.items?.reduce(
            (sum, i) => sum + (i.totalPrice ?? 0),
            0,
        ) || 0) + totalPrice;

        await this.pattycashRepository.save(pattyCash);

        return item;
    }


    /** Soft delete */
    async softDelete(id: number): Promise<void> {
        const pattyCash = await this.findOne(id);
        await this.pattycashRepository.softRemove(pattyCash);
    }

    /** Restore soft-deleted */
    async restore(id: number): Promise<void> {
        await this.pattycashRepository.restore(id);
    }

    /** Force delete permanently */
    async forceDelete(id: number): Promise<void> {
        await this.pattycashRepository.delete(id);
    }

    /** Create Pattycash (Fixed Type Error) */
    async createPattycash(dto: CreatePattycashDto, uploadedFiles?: Express.Multer.File[]): Promise<PattyCash> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // 1. เน€เธยเน€เธเธ‘เน€เธโ€เน€เธยเน€เธเธ’เน€เธเธ Job
            let job: Job | null = null;
            if (dto.jobId) {
                job = await queryRunner.manager.findOne(Job, { where: { id: Number(dto.jobId) } });
            }

            // 2. เน€เธยเน€เธเธ‘เน€เธโ€เน€เธยเน€เธเธ’เน€เธเธ Supplier
            let supplier: Supplier | null = null;
            if (dto.supplierId) {
                supplier = await queryRunner.manager.findOne(Supplier, { where: { id: Number(dto.supplierId) } });
            }

            let depart: Depart | null = null;
            if (dto.departId) {
                depart = await queryRunner.manager.findOne(Depart, { where: { id: dto.departId } });
            }

            // 3. เน€เธเธเน€เธเธเน€เธยเน€เธเธ’เน€เธย Instance PattyCash
            const pattyCash = queryRunner.manager.create(PattyCash, {
                pattycashNumber: await this.generatePattycashNumber(queryRunner),

                // เนยโ€ฆ เน€เธยเน€เธยเน€เธยเน€เธยเน€เธยเน€เธโ€ขเน€เธเธเน€เธยเน€เธยเน€เธเธ•เน€เธย: เน€เธยเน€เธยเน€เธย ?? undefined เน€เธโฌเน€เธยเน€เธเธ—เน€เธยเน€เธเธเน€เธยเน€เธยเน€เธเธเน€เธยเน€เธยเน€เธเธ‘เน€เธยเน€เธยเน€เธยเน€เธเธ’ null
                job: job ?? undefined,
                jobId: job?.id,
                requester: dto.requester,
                jobNote: dto.jobNote ?? '',
                extraCharge: dto.extraCharge ?? false,
                status: dto.status || PattycashStatus.DRAFT,
                supplierId: supplier?.id,
                departId: depart?.id,
                depart: depart?.departName || dto['departName'] || 'เน€เธยเน€เธเธเน€เธยเน€เธเธเน€เธเธเน€เธยเน€เธเธ',
                supplier: supplier?.companyName || dto['supplierName'] || 'เน€เธยเน€เธเธเน€เธยเน€เธเธเน€เธเธเน€เธยเน€เธเธ',

                deliveryLocation: dto.deliveryLocation || 'เน€เธยเน€เธเธเน€เธยเน€เธเธเน€เธเธเน€เธยเน€เธเธ',
                remark: dto.remark || '',

                requestDate: dto.requestDate
                    ? new Date(dto.requestDate).toISOString().split('T')[0]
                    : new Date().toISOString().split('T')[0],
                requiredDate: dto.requiredDate
                    ? new Date(dto.requiredDate).toISOString().split('T')[0]
                    : undefined,

                vatPercent: Number(dto.vatPercent ?? 7),
                discountPercent: Number(dto.discountPercent ?? 0),
                withholdingPercent: Number(dto.withholdingPercent ?? 0),
            });

            // 4. เน€เธยเน€เธเธ“เน€เธยเน€เธเธเน€เธโ€เน€เธเธเน€เธเธเน€เธโ€เน€เธโฌเน€เธยเน€เธเธ”เน€เธย
            const itemsData = dto.items || [];

            const subtotal = itemsData.reduce((sum, i) => {
                const qty = Number(i.quantity || 0);
                const price = Number(i.unitPrice || 0);
                return sum + (Number(i.totalPrice) || (qty * price));
            }, 0);


            const discountAmount = subtotal * (Number(pattyCash.discountPercent) / 100);
            const afterDiscount = subtotal - discountAmount;

            const whtAmount = afterDiscount * (Number(pattyCash.withholdingPercent) / 100);
            const afterWht = afterDiscount - whtAmount;

            const vatAmount = afterWht * (Number(pattyCash.vatPercent) / 100);

            pattyCash.grandTotal = afterWht + vatAmount;

            // เน€เธยเน€เธเธ‘เน€เธยเน€เธโ€”เน€เธเธ–เน€เธย Header
            const savedPattyCash = await queryRunner.manager.save(pattyCash);

            if (uploadedFiles && uploadedFiles.length > 0) {
                await this.saveFiles(savedPattyCash.id, uploadedFiles, queryRunner.manager);
            }

            // 5. เน€เธยเน€เธเธ‘เน€เธยเน€เธโ€”เน€เธเธ–เน€เธย Items
            if (itemsData.length > 0) {
                const itemsEntities = itemsData.map((i) => {
                    const qty = Number(i.quantity || 0);
                    const price = Number(i.unitPrice || 0);

                    return queryRunner.manager.create(PattycashItem, {
                        name: i.name || i.description || 'Item',
                        description: i.description,
                        quantity: qty,
                        unit: i.unit,
                        unitPrice: price,
                        totalPrice: Number(i.totalPrice) || (qty * price),
                        pattyCashId: savedPattyCash.id,
                    });
                });
                await queryRunner.manager.save(itemsEntities);
            }

            // 6. เน€เธยเน€เธเธ‘เน€เธยเน€เธโ€”เน€เธเธ–เน€เธย Approvals
            if (dto.approvals && dto.approvals.length > 0) {
                const approvals = dto.approvals.map((a) =>
                    queryRunner.manager.create(PattycashApproval, {
                        approverEmail: a.approverEmail,
                        comment: a.comment,
                        status: ApprovalStatus.PENDING,
                        actionDate: new Date(),
                        pattyCashId: savedPattyCash.id,
                    }),
                );
                await queryRunner.manager.save(approvals);
            }

            await queryRunner.commitTransaction();
            return this.findOne(savedPattyCash.id);

        } catch (err) {
            await queryRunner.rollbackTransaction();
            console.error("Create PattyCash Error:", err);
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    /** Update Pattycash */
    async updatePattycash(id: number, dto: UpdatePattycashDto, newFiles?: Express.Multer.File[]): Promise<PattyCash> {
        const pattyCash = await this.findOne(id);
        if (pattyCash.status === PattycashStatus.APPROVED)
            throw new BadRequestException('เน€เธเธเน€เธเธ’เน€เธเธเน€เธเธ’เน€เธเธเน€เธโ€“เน€เธยเน€เธยเน€เธยเน€เธยเน€เธยเน€เธยเน€เธโ€เน€เธยเน€เธโฌเน€เธยเน€เธยเน€เธเธ’เน€เธเธ DRAFT เน€เธโฌเน€เธโ€”เน€เธยเน€เธเธ’เน€เธยเน€เธเธ‘เน€เธยเน€เธย');

        return this.dataSource.transaction(async (manager) => {
            if (dto.jobId) {
                const job = await manager.findOne(Job, { where: { id: dto.jobId } });
                if (!job) throw new NotFoundException('Job เน€เธยเน€เธเธเน€เธยเน€เธยเน€เธย');
                pattyCash.job = job;
                pattyCash.jobId = job.id;
            }

            if (dto.supplierId !== undefined) {
                const supplier = await manager.findOne(Supplier, { where: { id: dto.supplierId } });
                if (!supplier) throw new NotFoundException('Supplier เน€เธยเน€เธเธเน€เธยเน€เธยเน€เธย');
                pattyCash.supplierId = supplier.id;
                pattyCash.supplier = supplier.companyName;
            }

            let depart: Depart | null = null;
            if (dto.departId) {
                depart = await this.dataSource.getRepository(Depart).findOneBy({ id: dto.departId });
                if (!depart) throw new NotFoundException('เน€เธยเน€เธเธเน€เธยเน€เธยเน€เธย Depart ');
                pattyCash.departId = depart.id;
                pattyCash.depart = depart.departName;
            }
            
            // ✅ ต้อง save pattyCash ก่อน เพื่อให้ได้ id
            await manager.save(pattyCash);
            
            if (newFiles && newFiles.length > 0) {
                await this.saveFiles(pattyCash.id, newFiles, manager);
            }

            pattyCash.requester = dto.requester ?? pattyCash.requester;
            pattyCash.jobNote = dto.jobNote ?? pattyCash.jobNote ?? '';
            pattyCash.extraCharge = dto.extraCharge ?? pattyCash.extraCharge;
            pattyCash.deliveryLocation = dto.deliveryLocation ?? pattyCash.deliveryLocation;
            pattyCash.requestDate = dto.requestDate ?? pattyCash.requestDate;
            pattyCash.requiredDate = dto.requiredDate ?? pattyCash.requiredDate;
            pattyCash.vatPercent = dto.vatPercent ?? pattyCash.vatPercent;
            pattyCash.discountPercent = dto.discountPercent ?? pattyCash.discountPercent;
            pattyCash.withholdingPercent = dto.withholdingPercent ?? pattyCash.withholdingPercent;
            pattyCash.remark = dto.remark ?? pattyCash.remark;
            pattyCash.depart = depart?.departName ?? pattyCash.depart ?? 'เธขเธฑเธเนเธกเนเธฃเธฐเธเธธ';

            if (dto.status) {
                pattyCash.status = dto.status;
            }

            // Items
            if (dto.items !== undefined) {
                let normalizedItems: any[] = [];
                if (Array.isArray(dto.items)) {
                    normalizedItems = dto.items;
                } else if (typeof dto.items === 'string') {
                    try {
                        const parsed = JSON.parse(dto.items);
                        normalizedItems = Array.isArray(parsed) ? parsed : [parsed];
                    } catch {
                        throw new BadRequestException('items format is invalid');
                    }
                } else if (dto.items && typeof dto.items === 'object') {
                    normalizedItems = [dto.items];
                }

                if (pattyCash.items?.length) await manager.remove(pattyCash.items);
                pattyCash.items = normalizedItems.map((i) =>
                    manager.create(PattycashItem, {
                        name: i.name?.trim() || i.description?.trim() || 'Item',
                        description: i.description,
                        quantity: Number(i.quantity) || 0,
                        unit: i.unit,
                        unitPrice: Number(i.unitPrice) || 0,
                        totalPrice: i.totalPrice ?? (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0),
                        pattyCashId: pattyCash.id,
                    }),
                );
                await manager.save(pattyCash.items);
            }

            // Approvals
            if (dto.approvals?.length) {
                const existingEmails = pattyCash.approvals?.map((a) => a.approverEmail) || [];
                for (const approvalDto of dto.approvals) {
                    if (!existingEmails.includes(approvalDto.approverEmail)) {
                        const newApproval = manager.create(PattycashApproval, {
                            approverEmail: approvalDto.approverEmail,
                            comment: approvalDto.comment,
                            status: ApprovalStatus.PENDING,
                            actionDate: new Date(),
                            pattyCashId: pattyCash.id,
                        });
                        await manager.save(newApproval);
                    }
                }
            }

            await manager.save(pattyCash);
            return this.findOne(pattyCash.id);
        });
    }

    /** Generate PDF */
    async generatePdf(id: number): Promise<Buffer> {
        const pattyCash = await this.findOne(id);

        // เน€เธยเน€เธเธ“เน€เธยเน€เธเธเน€เธโ€เน€เธเธเน€เธเธเน€เธโ€เน€เธเธเน€เธเธเน€เธเธ
        const subTotal = (pattyCash.items ?? []).reduce((sum, i) => {
            const qty = Number(i.quantity) || 0;
            const price = Number(i.unitPrice) || 0;
            const total = Number(i.totalPrice) || (qty * price);
            return sum + (isFinite(total) ? total : 0);
        }, 0);

        const withholdingPercent = Number(pattyCash.withholdingPercent) || 3;
        const vatPercent = Number(pattyCash.vatPercent) || 7;

        const withholding = subTotal * (withholdingPercent / 100);
        const subAfterWithholding = subTotal - withholding;
        const vat = subAfterWithholding * (vatPercent / 100);
        const grandTotal = subAfterWithholding + vat;

        // เน€เธโฌเน€เธยเน€เธเธ”เน€เธยเน€เธเธเน€เธเธเน€เธยเน€เธเธเน€เธยเน€เธยเน€เธเธ“เน€เธเธเน€เธยเน€เธเธ’เน€เธยเน€เธย เน€เธเธ’เน€เธเธเน€เธเธ’เน€เธยเน€เธโ€”เน€เธเธ (เน€เธโ€ขเน€เธเธเน€เธยเน€เธยเน€เธเธ•เน€เธยเน€เธยเน€เธเธเน€เธเธเน€เธยเน€เธโ€”เน€เธเธ‘เน€เธยเน€เธยเน€เธเธเน€เธเธเน€เธโ€)
        const subTotalText = bahttext(subTotal);
        const withholdingText = bahttext(withholding);
        const vatText = bahttext(vat);
        const grandTotalText = bahttext(grandTotal);

        if (!Number.isFinite(subTotal)) {
            console.warn("subTotal เน€เธโฌเน€เธยเน€เธยเน€เธย NaN", { items: pattyCash.items });
        }

        // --- เน€เธเธเน€เธยเน€เธเธเน€เธยเน€เธยเน€เธเธ‘เน€เธโ€เน€เธยเน€เธเธ’เน€เธเธเน€เธเธเน€เธเธเน€เธยเน€เธย เน€เธเธ’เน€เธย (เน€เธยเน€เธยเน€เธยเน€เธยเน€เธยเน€เธโ€ขเน€เธเธเน€เธยเน€เธยเน€เธเธ•เน€เธย) ---
        const imagesDir = path.join(process.cwd(), 'templates', 'images');
        const getImage = (filename: string) => {
            try {
                const filePath = path.join(imagesDir, filename);
                if (!fs.existsSync(filePath)) {
                    console.error(`Image file does not exist: ${filePath}`);
                    return '';
                }
                const bitmap = fs.readFileSync(filePath);

                // เน€เธโฌเน€เธยเน€เธยเน€เธยเน€เธยเน€เธเธ’เน€เธเธเน€เธเธเน€เธยเน€เธเธเน€เธเธ…เน€เธยเน€เธยเน€เธเธ…เน€เธยเน€เธโฌเน€เธยเน€เธเธ—เน€เธยเน€เธเธเน€เธยเน€เธเธ“เน€เธเธเน€เธยเน€เธโ€ header เน€เธยเน€เธเธเน€เธยเน€เธโ€“เน€เธเธเน€เธยเน€เธโ€ขเน€เธยเน€เธเธเน€เธย (.jpg เน€เธโ€ขเน€เธยเน€เธเธเน€เธยเน€เธโฌเน€เธยเน€เธยเน€เธย image/jpeg)
                const ext = path.extname(filename).toLowerCase();
                const mimeType = (ext === '.jpg' || ext === '.jpeg') ? 'image/jpeg' : 'image/png';

                return `data:${mimeType};base64,${bitmap.toString('base64')}`;
            } catch (err) {
                console.error(`Error reading image ${filename}:`, err);
                return '';
            }
        };

        const data = {
            // เน€เธโฌเน€เธเธเน€เธเธ•เน€เธเธเน€เธยเน€เธยเน€เธยเน€เธยเน€เธยเน€เธเธ‘เน€เธยเน€เธยเน€เธยเน€เธยเน€เธเธ‘เน€เธย getImage เน€เธยเน€เธเธ‘เน€เธยเน€เธยเน€เธยเน€เธเธ…เน€เธย logo.jpg
            logo: getImage('logo.jpg'),
            logos: {
                experteam: getImage('logo.jpg'),
            },
            companyName: 'EXPERTEAM COMPANY LIMITED',
            companyNameTh: 'เน€เธยเน€เธเธเน€เธเธ”เน€เธเธเน€เธเธ‘เน€เธโ€” เน€เธโฌเน€เธเธเน€เธยเน€เธยเน€เธโฌเน€เธยเน€เธเธ”เน€เธโ€”เน€เธโ€”เน€เธเธ•เน€เธเธ เน€เธยเน€เธเธ“เน€เธยเน€เธเธ‘เน€เธโ€',
            companyAddress: 'เน€เธเธเน€เธเธ“เน€เธยเน€เธเธ‘เน€เธยเน€เธยเน€เธเธ’เน€เธยเน€เธยเน€เธเธเน€เธยเน€เธย 1110,112,114 เน€เธโ€“เน€เธยเน€เธยเน€เธยเน€เธเธเน€เธเธเน€เธเธเน€เธเธ’เน€เธเธ2 เน€เธยเน€เธยเน€เธเธเน€เธยเน€เธยเน€เธเธเน€เธเธเน€เธโ€เน€เธเธ“ เน€เธโฌเน€เธยเน€เธโ€ขเน€เธยเน€เธเธ’เน€เธยเน€เธยเน€เธเธเน€เธยเน€เธโฌเน€เธโ€”เน€เธเธ•เน€เธเธเน€เธย เน€เธยเน€เธเธเน€เธเธเน€เธยเน€เธโฌเน€เธโ€”เน€เธยเน€เธเธเน€เธเธเน€เธเธ’เน€เธยเน€เธยเน€เธเธ 10150 เน€เธโฌเน€เธเธ…เน€เธยเน€เธโ€”เน€เธเธ•เน€เธยเน€เธยเน€เธเธเน€เธยเน€เธโฌเน€เธเธเน€เธเธ•เน€เธเธเน€เธย เน€เธเธ’เน€เธเธเน€เธเธ• 0 1055 35151 77 6',
            phone: '02-9896001',
            fax: '02-986451',
            email: 'extec@experteam.co.th',
            website: 'www.experteam.co.th',

            pattycashNumber: pattyCash.pattycashNumber,
            // เน€เธยเน€เธยเน€เธเธ…เน€เธยเน€เธเธเน€เธเธ‘เน€เธยเน€เธโ€”เน€เธเธ•เน€เธยเน€เธยเน€เธเธเน€เธยเน€เธโฌเน€เธยเน€เธยเน€เธยเน€เธเธเน€เธเธเน€เธยเน€เธยเน€เธยเน€เธยเน€เธโ€”เน€เธเธ•เน€เธยเน€เธเธเน€เธยเน€เธเธ’เน€เธยเน€เธยเน€เธยเน€เธเธ’เน€เธเธ (เน€เธโ€“เน€เธยเน€เธเธ’เน€เธยเน€เธเธ“เน€เธโฌเน€เธยเน€เธยเน€เธย)
            date: pattyCash.requestDate ? new Date(pattyCash.requestDate).toLocaleDateString('th-TH') : '-',
            jobName: pattyCash.job?.jobName || 'Administration',
            jobNo: pattyCash.job?.jobNo || pattyCash.jobId?.toString() || 'AM',
            trader: pattyCash.supplier || 'เน€เธยเน€เธเธเน€เธยเน€เธเธเน€เธเธเน€เธยเน€เธเธ',
            deliveryLocation: pattyCash.deliveryLocation || 'เน€เธเธเน€เธเธ‘เน€เธยเน€เธยเน€เธเธเน€เธยเน€เธเธเน€เธเธเน€เธยเน€เธเธ',
            requester: pattyCash.requester || 'เน€เธเธเน€เธเธ‘เน€เธยเน€เธยเน€เธเธเน€เธยเน€เธเธเน€เธเธเน€เธยเน€เธเธ',

            items: pattyCash.items?.map((item) => {
                const price = Number(item.unitPrice ?? 0);
                const total = Number(item.totalPrice ?? item.quantity * price);
                return {
                    description: item.description || '',
                    quantity: item.quantity || 0,
                    unit: item.unit || 'เน€เธเธเน€เธยเน€เธยเน€เธเธเน€เธเธ',
                    // เน€เธยเน€เธเธเน€เธย .toFixed(2) เน€เธโฌเน€เธยเน€เธเธ—เน€เธยเน€เธเธเน€เธยเน€เธเธเน€เธยเน€เธยเน€เธยเน€เธเธเน€เธย .00 เน€เธยเน€เธย PDF เน€เธเธเน€เธเธเน€เธเธเน€เธย
                    unitPrice: price.toFixed(2),
                    amount: total.toFixed(2),
                };
            }) || [],

            subTotal: Number(subTotal).toFixed(2),
            projectCode: pattyCash.job?.projectCode || '-',
            ccNo: pattyCash.job?.ccNo || '-',
            purchaseBy: pattyCash.requester || 'เน€เธเธเน€เธเธ‘เน€เธยเน€เธยเน€เธเธเน€เธยเน€เธเธเน€เธเธเน€เธยเน€เธเธ',
            remark: pattyCash.remark || '-',
            withholdingPercent: pattyCash.withholdingPercent ?? 3,
            withholding: withholding.toFixed(2),
            subAfterWithholding: subAfterWithholding.toFixed(2),
            vatPercent: pattyCash.vatPercent ?? 7,
            vat: vat.toFixed(2),
            grandTotal: grandTotal.toFixed(2),

            subTotalText,
            withholdingText,
            vatText,
            grandTotalText,

            sig1: pattyCash.approvals?.[0]?.signatureImage || '',
            sig2: pattyCash.approvals?.[1]?.signatureImage || '',
            sig3: pattyCash.approvals?.[2]?.signatureImage || '',

            page: '1/1',
            formCode: 'FP.PU01-003.PATTYCASH:01/01/2025',
        };

        const templatePath = path.join(process.cwd(), 'templates', 'pattycash.ejs');

        try {
            const html = await ejs.renderFile(templatePath, data);

            const browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
            });

            const page = await browser.newPage();
            await page.setContent(html, { waitUntil: 'networkidle0' });

            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
            });

            await browser.close();

            function bahtText(num: number): string {
                if (!Number.isFinite(num)) return 'เน€เธเธเน€เธเธเน€เธยเน€เธเธเน€เธยเน€เธยเน€เธเธ’เน€เธโ€”เน€เธโ€“เน€เธยเน€เธเธเน€เธย';
                if (num === 0) return 'เน€เธเธเน€เธเธเน€เธยเน€เธเธเน€เธยเน€เธยเน€เธเธ’เน€เธโ€”เน€เธโ€“เน€เธยเน€เธเธเน€เธย';

                const numbers = ['เน€เธเธเน€เธเธเน€เธยเน€เธเธเน€เธย', 'เน€เธเธเน€เธยเน€เธเธ–เน€เธยเน€เธย', 'เน€เธเธเน€เธเธเน€เธย', 'เน€เธเธเน€เธเธ’เน€เธเธ', 'เน€เธเธเน€เธเธ•เน€เธย', 'เน€เธเธเน€เธยเน€เธเธ’', 'เน€เธเธเน€เธย', 'เน€เธโฌเน€เธยเน€เธยเน€เธโ€', 'เน€เธยเน€เธยเน€เธโ€', 'เน€เธโฌเน€เธยเน€เธยเน€เธเธ’'];
                const units = ['', 'เน€เธเธเน€เธเธ”เน€เธย', 'เน€เธเธเน€เธยเน€เธเธเน€เธเธ', 'เน€เธยเน€เธเธ‘เน€เธย', 'เน€เธเธเน€เธเธเน€เธเธ—เน€เธยเน€เธย', 'เน€เธยเน€เธเธเน€เธย', 'เน€เธเธ…เน€เธยเน€เธเธ’เน€เธย'];
                const [baht, satang] = num.toFixed(2).split('.').map(Number);

                let bahtStr = '';
                if (baht > 0) {
                    const digits = baht.toString().split('').reverse();
                    for (let i = 0; i < digits.length; i++) {
                        const d = Number(digits[i]);
                        if (d === 0) continue;

                        let text = numbers[d];
                        if (i === 1) { // เน€เธเธเน€เธเธ”เน€เธย
                            text = d === 1 ? 'เน€เธเธเน€เธเธ”เน€เธย' : (d === 2 ? 'เน€เธเธเน€เธเธ•เน€เธยเน€เธเธเน€เธเธ”เน€เธย' : numbers[d] + 'เน€เธเธเน€เธเธ”เน€เธย');
                        } else if (i === 0 && d === 1 && digits.length > 1) {
                            text = 'เน€เธโฌเน€เธเธเน€เธยเน€เธโ€';
                        }
                        bahtStr = text + (i < 6 ? units[i] : (i % 6 === 0 ? 'เน€เธเธ…เน€เธยเน€เธเธ’เน€เธย' : '')) + bahtStr;
                    }
                } else {
                    bahtStr = 'เน€เธเธเน€เธเธเน€เธยเน€เธเธเน€เธย';
                }

                let result = bahtStr + 'เน€เธยเน€เธเธ’เน€เธโ€”';

                if (satang > 0) {
                    let satangStr = '';
                    const sDigits = satang.toString().padStart(2, '0').split('');
                    const ten = Number(sDigits[0]);
                    const one = Number(sDigits[1]);

                    if (ten > 0) {
                        satangStr += ten === 1 ? 'เน€เธเธเน€เธเธ”เน€เธย' : (ten === 2 ? 'เน€เธเธเน€เธเธ•เน€เธยเน€เธเธเน€เธเธ”เน€เธย' : numbers[ten] + 'เน€เธเธเน€เธเธ”เน€เธย');
                    }
                    if (one > 0) {
                        satangStr += (one === 1 && ten > 0) ? 'เน€เธโฌเน€เธเธเน€เธยเน€เธโ€' : numbers[one];
                    }
                    result += satangStr + 'เน€เธเธเน€เธโ€ขเน€เธเธ’เน€เธยเน€เธยเน€เธย';
                } else {
                    result += 'เน€เธโ€“เน€เธยเน€เธเธเน€เธย';  // เนยย เน€เธยเน€เธยเน€เธยเน€เธโ€ขเน€เธเธเน€เธยเน€เธยเน€เธเธ•เน€เธยเน€เธยเน€เธเธเน€เธยเน€เธยเน€เธเธ‘เน€เธเธเน€เธเธเน€เธย เน€เธยเน€เธเธเน€เธย "เน€เธโ€“เน€เธยเน€เธเธเน€เธย" เน€เธโฌเน€เธเธเน€เธเธเน€เธเธเน€เธโฌเน€เธเธเน€เธเธ—เน€เธยเน€เธเธเน€เธยเน€เธเธเน€เธยเน€เธเธเน€เธเธ•เน€เธเธเน€เธโ€ขเน€เธเธ’เน€เธยเน€เธยเน€เธย
                }

                return result;
            }
            return Buffer.from(pdfBuffer);
        } catch (error) {
            console.error('PDF Generation Error:', error);
            throw new Error(`Failed to generate PDF: ${error.message}`);
        }
    }

    /** Duplicate Pattycash */
    async duplicate(id: number): Promise<PattyCash> {
        const original = await this.findOne(id);
        if (original.status !== PattycashStatus.DRAFT)
            throw new BadRequestException('เน€เธเธเน€เธเธ’เน€เธเธเน€เธเธ’เน€เธเธเน€เธโ€“ duplicate เน€เธยเน€เธโ€เน€เธยเน€เธโฌเน€เธยเน€เธยเน€เธเธ’เน€เธเธ DRAFT');

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const duplicate = queryRunner.manager.create(PattyCash, {
                pattycashNumber: await this.generatePattycashNumber(queryRunner),
                job: original.job,
                jobId: original.jobId,
                requester: original.requester,
                jobNote: original.jobNote,
                extraCharge: original.extraCharge,
                status: PattycashStatus.DRAFT,
                supplierId: original.supplierId,
                supplier: original.supplier,
                departId: original.departId,
                depart: original.depart,
                deliveryLocation: original.deliveryLocation,
                requestDate: new Date().toISOString().split('T')[0],
                requiredDate: original.requiredDate,
                vatPercent: original.vatPercent,
                discountPercent: original.discountPercent,
                withholdingPercent: original.withholdingPercent,
                grandTotal: original.grandTotal,
                items: original.items?.map((item) =>
                    queryRunner.manager.create(PattycashItem, {
                        name: item.name || item.description || 'เน€เธเธเน€เธเธ”เน€เธยเน€เธยเน€เธยเน€เธเธ’เน€เธยเน€เธเธ’เน€เธยเน€เธยเน€เธเธ’เน€เธเธเน€เธยเน€เธเธ‘เน€เธโ€เน€เธเธ…เน€เธเธเน€เธย',
                        description: item.description,
                        quantity: item.quantity,
                        unit: item.unit,
                        unitPrice: item.unitPrice,
                        totalPrice: item.totalPrice,
                    }),
                ) || [],
                approvals: [],
            });

            const saved = await queryRunner.manager.save(duplicate);
            await queryRunner.commitTransaction();
            return saved;
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    async reject(
        id: number,
        approverEmail: string,
        remark?: string,
    ): Promise<PattyCash> {
        const pattyCash = await this.pattycashRepository.findOne({
            where: { id, deletedAt: IsNull() },
            relations: ['approvals'],
        });

        if (!pattyCash) throw new NotFoundException('Pattycash เน€เธยเน€เธเธเน€เธยเน€เธยเน€เธย');

        const approval = pattyCash.approvals.find(a => a.approverEmail === approverEmail);
        if (!approval) {
            throw new BadRequestException('เน€เธยเน€เธเธเน€เธยเน€เธยเน€เธย approver เน€เธเธเน€เธเธ“เน€เธเธเน€เธเธเน€เธเธ‘เน€เธย email เน€เธยเน€เธเธ•เน€เธย');
        }

        approval.status = ApprovalStatus.REJECTED; // เน€เธยเน€เธยเน€เธย enum
        approval.remark = remark || '';
        approval.updatedAt = new Date();

        await this.pattycashApprovalRepository.save(approval);

        // เน€เธโฌเน€เธยเน€เธเธ…เน€เธเธ•เน€เธยเน€เธเธเน€เธยเน€เธเธเน€เธโ€“เน€เธเธ’เน€เธยเน€เธเธเน€เธยเน€เธเธเน€เธย pattycash เน€เธโฌเน€เธยเน€เธยเน€เธย REJECTED เน€เธโ€“เน€เธยเน€เธเธ’เน€เธเธเน€เธเธ• approver reject
        pattyCash.status = PattycashStatus.REJECTED;
        await this.pattycashRepository.save(pattyCash);

        return pattyCash;
    }

    private async saveFiles(
        pattyCashId: number,
        files: Express.Multer.File[],
        manager: EntityManager
    ) {
        const uploadDir = `./uploads/pattycash/${pattyCashId}`;
        await fs.ensureDir(uploadDir);

        const fileEntities: PattycashFile[] = [];

        for (const file of files) {
            // เน€เธยเน€เธยเน€เธย uuid เน€เธยเน€เธเธ…เน€เธเธเน€เธโ€เน€เธย เน€เธเธ‘เน€เธเธเน€เธยเน€เธเธเน€เธยเน€เธเธ’ Date.now()
            const fileName = `${crypto.randomUUID()}-${file.originalname}`;
            const filePath = path.join(uploadDir, fileName);

            // เนยโ€ฆ 1. เน€เธโฌเน€เธยเน€เธเธ•เน€เธเธเน€เธยเน€เธยเน€เธยเน€เธเธ…เน€เธยเน€เธยเน€เธยเน€เธเธเน€เธย (เน€เธยเน€เธเธเน€เธย DB transaction logic)
            await fs.writeFile(filePath, file.buffer);

            // เน€เธโฌเน€เธโ€ขเน€เธเธเน€เธเธ•เน€เธเธเน€เธเธ entity เน€เธยเน€เธเธเน€เธยเน€เธยเน€เธยเน€เธเธเน€เธย
            fileEntities.push(
                manager.create(PattycashFile, {
                    fileName: file.originalname,
                    filePath: filePath.replace(/\\/g, '/').replace('./', '/'),
                    fileType: file.mimetype,
                    pattyCashId,
                })
            );
        }

        // เนยโ€ฆ 2. save DB เน€เธยเน€เธเธเน€เธเธ‘เน€เธยเน€เธยเน€เธโฌเน€เธโ€เน€เธเธ•เน€เธเธเน€เธเธ
        await manager.save(fileEntities);
    }


}

