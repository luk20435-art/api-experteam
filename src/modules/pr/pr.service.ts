import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  DataSource,
  Like,
  IsNull,
  Not,
  QueryRunner,
} from 'typeorm';
import { Pr, PrStatus } from './entity/pr.entity';
import { PrItem } from './entity/pr-item.entity';
import { PrApproval, ApprovalStatus } from './entity/pr-approvals.entity';
import { CreatePrItemDto } from './dto/create-pr-item.dto';
import { CreateApprovalDto } from './dto/create-pr-approval.dto';
import { Job } from 'src/modules/job/entity/job.entity';
import { Supplier } from '../supplier/entity/supplier.entity';
import * as puppeteer from 'puppeteer';
import * as ejs from 'ejs';
import * as path from 'path';
import { CreatePrDto } from './dto/create-pr.dto';
import { Depart } from '../depart/entity/depart.entity';
import { PrAttachment } from './entity/pr-attachment.entity';
import * as fs from 'fs';
import bahttext from 'thai-baht-text';

@Injectable()
export class PrService {
  constructor(
    @InjectRepository(Pr)
    private readonly prRepository: Repository<Pr>,
    @InjectRepository(PrItem)
    private readonly prItemRepository: Repository<PrItem>,
    @InjectRepository(PrApproval)
    private readonly prApprovalRepository: Repository<PrApproval>,
    @InjectRepository(Job)
    private readonly jobRepository: Repository<Job>,
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,
    @InjectRepository(Depart)
    private readonly departRepository: Repository<Depart>,
    private readonly dataSource: DataSource,
  ) { }

  /** สร้างเลข PR อัตโนมัติ - ใช้ใน transaction เพื่อความปลอดภัย */
  private async generatePrNumber(queryRunner: QueryRunner): Promise<string> {
    const yearShort = String(new Date().getFullYear()).slice(-2);

    const result = await queryRunner.manager.query(
      `
      SELECT "prNumber"
      FROM "pr"
      WHERE "prNumber" LIKE $1
      ORDER BY "prNumber" DESC
      LIMIT 1
      FOR UPDATE
      `,
      [`PR%/${yearShort}`],
    );

    let seq = 1;
    if (result.length > 0) {
      const lastNumber: string = result[0].prNumber;
      const match = lastNumber.match(/PR(\d{4})\//);
      if (match) {
        seq = parseInt(match[1], 10) + 1;
      }
    }

    return `PR${String(seq).padStart(4, '0')}/${yearShort}`;
  }

  /** สร้าง PR ใหม่ */
  async createPr(dto: CreatePrDto, files?: Express.Multer.File[]): Promise<Pr> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. หา Job (required)
      const job = await queryRunner.manager.findOne(Job, { where: { id: dto.jobId } });
      if (!job) throw new NotFoundException('Job ไม่พบ');

      // 2. หา Supplier (optional)
      let supplier: Supplier | null = null;
      if (dto.supplierId) {
        supplier = await queryRunner.manager.findOne(Supplier, { where: { id: dto.supplierId } });
      }

      // 3. หา Depart (optional)
      let depart: Depart | null = null;
      if (dto.depart) {
        depart = await queryRunner.manager.findOne(Depart, { where: { id: dto.depart } });
      }

      // 4. สร้าง PR entity (ใช้ manager.create ถูกต้องแล้ว)
      const pr = queryRunner.manager.create(Pr, {
        prNumber: await this.generatePrNumber(queryRunner),
        job,
        jobId: job.id,
        supplierId: supplier?.id,
        supplier: supplier?.companyName || 'ยังไม่ระบุ',
        departId: depart?.id,
        depart: depart?.departName || undefined,
        requester: dto.requester,
        jobNote: dto.jobNote ?? '',
        extraCharge: dto.extraCharge ?? false,
        status: dto.status || PrStatus.DRAFT,
        requestDate: dto.requestDate ? new Date(dto.requestDate) : new Date(),
        requiredDate: dto.requiredDate ? new Date(dto.requiredDate) : undefined,
        deliveryLocation: dto.deliveryLocation ?? '',
        planType: dto.planType ?? '',
        trader: dto.trader ?? '',
        jobNo: dto.jobNo ?? '',
        ccNo: dto.ccNo ?? '',
        expteamQuotation: dto.expteamQuotation ?? '',
        remark: dto.remark ?? '',
        vatPercent: dto.vatPercent ?? 7,
        discountPercent: dto.discountPercent ?? 0,
        withholdingPercent: dto.withholdingPercent ?? 0,
        currency: dto.currency ?? '',
        discountType: dto.discountType ?? '',
        discountValue: dto.discountValue ?? '',
        estimatedPrCost: dto.estimatedPrCost ?? 0,
        jobBalanceCost: dto.jobBalanceCost ?? 0,
      });

      // คำนวณ duration
      if (pr.requiredDate) {
        const diffTime = pr.requiredDate.getTime() - pr.requestDate.getTime();
        pr.duration = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      // คำนวณยอดเงิน
      const subtotal = (dto.items ?? []).reduce((sum, item) => {
        return sum + (Number(item.quantity ?? 0) * Number(item.unitPrice ?? 0));
      }, 0);

      const discountPercent = dto.discountPercent ?? 0;
      const discountAmount = subtotal * (discountPercent / 100);
      const afterDiscount = subtotal - discountAmount;

      const vatPercent = dto.vatPercent ?? 7;
      const vatAmount = afterDiscount * (vatPercent / 100);

      pr.grandTotal = afterDiscount + vatAmount;

      // 5. บันทึก PR (Save Entity)
      const savedPr = await queryRunner.manager.save(pr);

      // 6. บันทึก items
      if (!dto.items || dto.items.length === 0) {
        throw new BadRequestException('ต้องมีอย่างน้อย 1 รายการสินค้า');
      }

      // ✅ Map เป็น Entity Instance ด้วย manager.create
      const prItems = dto.items.map((item, index) => {
        const desc = item.description?.trim();
        if (!desc) {
          throw new BadRequestException(`รายการสินค้าที่ ${index + 1}: Description ห้ามว่าง`);
        }
        return queryRunner.manager.create(PrItem, {
          pr: savedPr,
          description: desc,
          quantity: Number(item.quantity ?? 1),
          unit: item.unit?.trim() || 'ชิ้น',
          unitPrice: Number(item.unitPrice ?? 0),
          totalPrice: (Number(item.quantity ?? 1)) * (Number(item.unitPrice ?? 0)),
        });
      });

      // ✅ ระบุ Entity Class ตอน Save เพื่อความชัวร์: manager.save(PrItem, prItems)
      await queryRunner.manager.save(PrItem, prItems);

      // 7. บันทึก approvals (optional)
      if (dto.approvals?.length) {
        const prApprovals = dto.approvals.map(approval => {
          return queryRunner.manager.create(PrApproval, {
            pr: savedPr,
            approverEmail: approval.approverEmail,
            status: ApprovalStatus.PENDING,
            comment: approval.comment,
            actionDate: new Date(),
          });
        });
        await queryRunner.manager.save(PrApproval, prApprovals);
      }

      // 8. บันทึกไฟล์แนบ (optional) - 🔥 แก้ไขจุดนี้
      if (files?.length) {
        // ✅ ต้องใช้ manager.create เพื่อสร้าง Entity Instance (PrAttachment)
        const attachments = files.map(file => {
          return queryRunner.manager.create(PrAttachment, {
            pr: savedPr,
            fileName: file.filename,
            originalFileName: file.originalname,
            filePath: file.path,
            mimeType: file.mimetype,
            fileSize: file.size,
            uploadedAt: new Date(),
          });
        });
        // ✅ Save Entity Instances
        await queryRunner.manager.save(PrAttachment, attachments);
      }

      await queryRunner.commitTransaction();
      return savedPr;

    } catch (err) {
      await queryRunner.rollbackTransaction();
      console.error('🔥 CREATE PR ERROR:', err);
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /** อัปเดต PR */
  async updatePr(id: number, dto: CreatePrDto, files?: Express.Multer.File[]): Promise<Pr> {
    const pr = await this.prRepository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['items', 'approvals', 'job', 'attachments'],
    });
    if (!pr) throw new NotFoundException('PR ไม่พบ');
    if (pr.status === PrStatus.APPROVED)
      throw new BadRequestException('PR ที่อนุมัติสำเร็จแล้ว ไม่สามารถแก้ไขได้');

    const job = await this.dataSource.getRepository(Job).findOneBy({ id: Number(dto.jobId) });
    if (!job) throw new NotFoundException('Job ไม่พบ');

    let supplier: Supplier | null = null;
    if (dto.supplierId) {
      supplier = await this.dataSource.getRepository(Supplier).findOneBy({ id: dto.supplierId });
      if (!supplier) throw new NotFoundException(`ไม่พบ Supplier ID: ${dto.supplierId}`);
    }

    let depart: Depart | null = null;
    if (dto.depart) {
      depart = await this.dataSource.getRepository(Depart).findOneBy({ id: dto.depart });
      if (!depart) throw new NotFoundException(`ไม่พบ Depart ID: ${dto.depart}`);
    }

    const requestDate = dto.requestDate ? new Date(dto.requestDate) : new Date(pr.requestDate);
    const requiredDate = dto.requiredDate ? new Date(dto.requiredDate) : undefined;
    const duration = requiredDate
      ? Math.ceil((requiredDate.getTime() - requestDate.getTime()) / (1000 * 60 * 60 * 24))
      : pr.duration;

    const withholdingPercent = dto.withholdingPercent ?? pr.withholdingPercent ?? 3;
    const subtotal = (dto.items ?? pr.items ?? []).reduce((sum, item) => {
      return sum + (Number(item.quantity ?? 0) * Number(item.unitPrice ?? 0));
    }, 0);

    const discountAmount = subtotal * ((dto.discountPercent ?? pr.discountPercent ?? 0) / 100);
    const subAfterDiscount = subtotal - discountAmount;
    const withholdingAmount = subAfterDiscount * (withholdingPercent / 100);
    const subAfterWithholding = subAfterDiscount - withholdingAmount;
    const vatPercent = dto.vatPercent ?? pr.vatPercent ?? 7;
    const vatAmount = subAfterWithholding * (vatPercent / 100);
    const grandTotal = subAfterWithholding + vatAmount;

    return await this.dataSource.transaction(async (manager) => {
      pr.job = job;
      pr.jobId = job.id;
      pr.requester = dto.requester ?? pr.requester;
      pr.jobNote = dto.jobNote ?? pr.jobNote ?? '';
      pr.extraCharge = dto.extraCharge ?? pr.extraCharge;
      pr.status = dto.status ?? pr.status;
      pr.supplierId = supplier?.id ?? pr.supplierId;
      pr.supplier = supplier?.companyName ?? pr.supplier ?? 'ยังไม่ระบุ';
      pr.departId = dto.depart ?? pr.departId;
      pr.depart = depart?.departName ?? pr.depart ?? 'ยังไม่ระบุ';
      pr.deliveryLocation = dto.deliveryLocation ?? pr.deliveryLocation ?? '';
      pr.planType = dto.planType ?? pr.planType ?? '';
      pr.requestDate = requestDate;
      pr.requiredDate = requiredDate;
      pr.paymentMethod = dto.paymentMethod ?? pr.paymentMethod;
      pr.paymentTerms = dto.paymentTerms ?? pr.paymentTerms;
      pr.remark = dto.remark ?? pr.remark;
      pr.deliveryLocation = dto.deliveryLocation ?? pr.deliveryLocation;
      pr.planType = dto.planType ?? pr.planType;
      pr.extraCharge = dto.extraCharge ?? pr.extraCharge;
      pr.duration = duration;
      pr.vatPercent = vatPercent;
      pr.discountPercent = dto.discountPercent ?? pr.discountPercent ?? 0;
      pr.withholdingPercent = withholdingPercent;
      pr.currency = dto.currency ?? pr.currency ?? '';
      pr.discountType = dto.discountType ?? pr.discountType ?? '';
      pr.discountValue = dto.discountValue ?? pr.discountValue ?? '';
      pr.grandTotal = grandTotal;

      // ลบ items เดิมแล้วสร้างใหม่
      if (pr.items?.length) await manager.remove(pr.items);
      pr.items = (dto.items ?? []).map(item =>
        manager.create(PrItem, { ...item, pr, prId: pr.id })
      );

      // เพิ่ม approvals ใหม่ (เฉพาะที่ยังไม่มี)
      const existingEmails = pr.approvals?.map(a => a.approverEmail) ?? [];
      if (dto.approvals?.length) {
        for (const approval of dto.approvals) {
          if (!existingEmails.includes(approval.approverEmail)) {
            const newApproval = manager.create(PrApproval, {
              approverEmail: approval.approverEmail,
              status: ApprovalStatus.PENDING,
              comment: approval.comment,
              actionDate: new Date(),
              pr,
              prId: pr.id,
            });
            pr.approvals = pr.approvals ?? [];
            pr.approvals.push(newApproval);
            await manager.save(newApproval);
          }
        }
      }

      // อัปเดตไฟล์ attachments
      if (files?.length) {
        // ✅ แก้ไข: ใช้ manager.create เพื่อสร้าง Entity Instance
        const attachments = files.map(file =>
          manager.create(PrAttachment, {
            fileName: file.filename,
            originalFileName: file.originalname,
            filePath: file.path,
            mimeType: file.mimetype,
            fileSize: file.size,
            uploadedAt: new Date(),
            pr: pr // เชื่อม Relation
          })
        );

        // Save ลง DB (หรือจะ push ใส่ pr.attachments แล้ว save pr ก็ได้ถ้า cascade: true)
        await manager.save(PrAttachment, attachments);

        // ถ้าต้องการ return ค่ากลับไปให้หน้าบ้านเห็นทันที
        pr.attachments = pr.attachments ? [...pr.attachments, ...attachments] : attachments;
      }

      await manager.save(pr);
      return pr;
    });
  }

  /** Submit PR เพื่อขออนุมัติ (เปลี่ยนสถานะเป็น PENDING เท่านั้น) */
  async submitForApproval(prId: number) {
    const pr = await this.prRepository.findOne({
      where: { id: prId },
      relations: ['approvals'],
    });
    if (!pr) throw new NotFoundException('PR ไม่พบ');

    if (pr.status !== PrStatus.DRAFT)
      throw new BadRequestException('PR ถูกส่งแล้ว');

    if (!pr.approvals || pr.approvals.length === 0) {
      throw new BadRequestException('กรุณาเพิ่มผู้อนุมัติอย่างน้อย 1 คน');
    }

    pr.status = PrStatus.PENDING;
    await this.prRepository.save(pr);

    return pr;
  }

  /** อนุมัติ PR - เปลี่ยน status เป็น APPROVED */
  async approvePr(id: number): Promise<Pr> {
    const pr = await this.prRepository.findOne({
      where: { id },
      relations: ['approvals'],
    });

    if (!pr) {
      throw new NotFoundException('PR ไม่พบ');
    }

    if (pr.status !== PrStatus.PENDING) {
      throw new BadRequestException(
        `ไม่สามารถอนุมัติได้ (สถานะปัจจุบัน: ${pr.status}, ต้องเป็น PENDING)`
      );
    }

    pr.status = PrStatus.APPROVED;

    if (pr.approvals && pr.approvals.length > 0) {
      pr.approvals = pr.approvals.map((approval) => {
        approval.status = ApprovalStatus.APPROVED;
        approval.actionDate = new Date();
        return approval;
      });
    }

    const updatedPr = await this.prRepository.save(pr);
    return updatedPr;
  }

  /** ปฏิเสธ PR */
  async rejectPr(prId: number, email: string, remark?: string): Promise<Pr> {
    const pr = await this.prRepository.findOne({
      where: { id: prId, deletedAt: IsNull() },
      relations: ['approvals'],
    });
    if (!pr) throw new NotFoundException('PR ไม่พบ');

    if (pr.status !== PrStatus.PENDING) {
      throw new BadRequestException('ไม่สามารถปฏิเสธ PR ที่ไม่ใช่ PENDING');
    }

    const approval = pr.approvals.find(a => a.approverEmail === email);
    if (!approval) throw new BadRequestException('คุณไม่ได้เป็นผู้อนุมัติ');

    approval.status = ApprovalStatus.REJECTED;
    approval.comment = remark;
    approval.actionDate = new Date();
    pr.status = PrStatus.REJECTED;

    await this.dataSource.transaction(async manager => {
      await manager.save(approval);
      await manager.save(pr);
    });

    return pr;
  }

  async findAll(): Promise<Pr[]> {
    return this.prRepository.find({
      where: { deletedAt: IsNull() },
      relations: ['job', 'items', 'approvals', 'attachments'],
      order: { id: 'DESC' },
    });
  }

  async findTrashed(): Promise<Pr[]> {
    return this.prRepository.find({
      where: { deletedAt: Not(IsNull()) },
      withDeleted: true,
      relations: ['job', 'items', 'approvals', 'attachments'],
      order: { deletedAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Pr> {
    const pr = await this.prRepository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['job', 'items', 'approvals', 'attachments'],
    });
    if (!pr) throw new NotFoundException('PR ไม่พบ');
    return pr;
  }

  async softDelete(id: number): Promise<void> {
    const result = await this.prRepository.softDelete(id);
    if (result.affected === 0) throw new NotFoundException('PR ไม่พบ');
  }

  async restore(id: number): Promise<Pr> {
    const result = await this.prRepository.restore(id);
    if (result.affected === 0) throw new NotFoundException('ไม่พบ PR ในถังขยะ');
    return this.findOne(id);
  }

  async forceDelete(id: number): Promise<void> {
    const result = await this.prRepository.delete(id);
    if (result.affected === 0) throw new NotFoundException('PR ไม่พบ');
  }

  async addItem(prId: number, dto: CreatePrItemDto): Promise<PrItem> {
    const pr = await this.prRepository.findOneBy({ id: prId });
    if (!pr) throw new NotFoundException('PR ไม่พบ');
    const item = this.dataSource.getRepository(PrItem).create({ ...dto, pr, prId });
    return await this.dataSource.getRepository(PrItem).save(item);
  }

  async addApproval(prId: number, dto: CreateApprovalDto): Promise<PrApproval> {
    const pr = await this.prRepository.findOneBy({ id: prId });
    if (!pr) throw new NotFoundException('PR ไม่พบ');

    const approval = this.dataSource.getRepository(PrApproval).create({
      ...dto,
      status: dto.status ? ApprovalStatus[dto.status as keyof typeof ApprovalStatus] : ApprovalStatus.PENDING,
      actionDate: new Date(),
      pr,
      prId,
    });

    return await this.dataSource.getRepository(PrApproval).save(approval);
  }

  async generatePrPdf(id: number): Promise<Buffer> {
    const pr = await this.findOne(id);

    // --- 1. ฟังก์ชันแปลงตัวเลขเป็นบาทไทย (ต้องมี) ---


    // --- 2. ฟังก์ชันอ่านรูป ---
    const imagesDir = path.join(process.cwd(), 'templates', 'images');
    const getImage = (filename: string) => {
      try {
        const filePath = path.join(imagesDir, filename);
        if (!fs.existsSync(filePath)) return '';
        const bitmap = fs.readFileSync(filePath);
        const ext = path.extname(filename).toLowerCase();
        const mimeType = (ext === '.jpg' || ext === '.jpeg') ? 'image/jpeg' : 'image/png';
        return `data:${mimeType};base64,${bitmap.toString('base64')}`;
      } catch (err) { return ''; }
    };

    // --- 3. คำนวณยอดเงิน (บังคับคำนวณใหม่) ---
    const itemsWithTotal = pr.items?.map(item => {
      const qty = Number(item.quantity || 0);
      const price = Number(item.unitPrice || 0);
      const total = qty * price;
      return { ...item, quantity: qty, unitPrice: price, calculatedTotal: total };
    }) || [];

    const subTotal = itemsWithTotal.reduce((sum, item) => sum + item.calculatedTotal, 0);
    const withholdingPercent = Number(pr.withholdingPercent ?? 0);
    const withholding = subTotal * (withholdingPercent / 100);
    const subAfterWithholding = subTotal - withholding;
    const vatPercent = Number(pr.vatPercent || 7);
    const vat = subAfterWithholding * (vatPercent / 100);
    const grandTotal = Number(subAfterWithholding + vat);

    const subTotalText = bahttext(subTotal);
    const withholdingText = bahttext(withholding);
    const vatText = bahttext(vat);
    const grandTotalText = bahttext(grandTotal);

    // --- 4. ส่งข้อมูลไปที่ PDF ---
    const data = {
      logo: getImage('logo.jpg'),
      logos: { experteam: getImage('logo.jpg') },
      companyName: 'EXPERTEAM COMPANY LIMITED',
      companyNameTh: 'บริษัท เอ็กเพิททีม จำกัด',
      companyAddress: 'สำนักงานใหญ่ 1110,112,114 ถนนพระราม2 แขวงแสมดำ เขตบางขุนเทียน กรุงเทพมหานคร 10150 เลขที่ผู้เสียภาษี 0 1055 35151 77 6',
      phone: '02-9896001',
      fax: '02-986451',
      email: 'extec@experteam.co.th',
      website: 'www.experteam.co.th',

      prNumber: pr.prNumber,
      date: pr.requestDate ? new Date(pr.requestDate).toLocaleDateString('th-TH') : '-',
      jobName: pr.job?.jobName || 'Administration',
      jobNo: pr.job?.jobNo || pr.jobId?.toString() || 'AM',
      projectCode: pr.job?.projectCode || '009.003-xxx/25',
      ccNo: pr.job?.ccNo || 'AM/22-01/2025',
      trader: pr.supplier || 'ไม่ระบุ',
      deliveryLocation: pr.deliveryLocation || 'ยังไม่ระบุ',
      purchaseBy: pr.requester || 'ยังไม่ระบุ',
      remark: pr.remark || '',

      items: itemsWithTotal.map((item) => ({
        description: item.description || item.name || '',
        quantity: item.quantity.toFixed(2),
        unit: item.unit || 'PCS',
        unitPrice: item.unitPrice.toFixed(2),
        amount: item.calculatedTotal.toFixed(2),
      })),

      subTotal: subTotal.toFixed(2),
      withholdingPercent: withholdingPercent,
      withholding: withholding.toFixed(2),
      subAfterWithholding: subAfterWithholding.toFixed(2),
      vatPercent: vatPercent,
      vat: vat.toFixed(2),
      grandTotal: grandTotal.toFixed(2),

      subTotalText,
      withholdingText,
      vatText,
      grandTotalText,

      sig1: pr.approvals?.[0]?.signatureImage || '',
      sig2: pr.approvals?.[1]?.signatureImage || '',
      sig3: pr.approvals?.[2]?.signatureImage || '',
      page: '1/1',
      formCode: 'FP.PU01-003.PR:01/07/2012 Rev.00',
    };

    const templatePath = path.join(process.cwd(), 'templates', 'work-order.ejs');
    try {
      const html = await ejs.renderFile(templatePath, data);
      const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' } });
      await browser.close();

      function bahttext(num: number): string {
        if (!Number.isFinite(num)) return 'ศูนย์บาทถ้วน';
        if (num === 0) return 'ศูนย์บาทถ้วน';

        const numbers = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
        const units = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];
        const [baht, satang] = num.toFixed(2).split('.').map(Number);

        let bahtStr = '';
        if (baht > 0) {
          const digits = baht.toString().split('').reverse();
          for (let i = 0; i < digits.length; i++) {
            const d = Number(digits[i]);
            if (d === 0) continue;

            let text = numbers[d];
            if (i === 1) { // สิบ
              text = d === 1 ? 'สิบ' : (d === 2 ? 'ยี่สิบ' : numbers[d] + 'สิบ');
            } else if (i === 0 && d === 1 && digits.length > 1) {
              text = 'เอ็ด';
            }
            bahtStr = text + (i < 6 ? units[i] : (i % 6 === 0 ? 'ล้าน' : '')) + bahtStr;
          }
        } else {
          bahtStr = 'ศูนย์';
        }

        let result = bahtStr + 'บาท';

        if (satang > 0) {
          let satangStr = '';
          const sDigits = satang.toString().padStart(2, '0').split('');
          const ten = Number(sDigits[0]);
          const one = Number(sDigits[1]);

          if (ten > 0) {
            satangStr += ten === 1 ? 'สิบ' : (ten === 2 ? 'ยี่สิบ' : numbers[ten] + 'สิบ');
          }
          if (one > 0) {
            satangStr += (one === 1 && ten > 0) ? 'เอ็ด' : numbers[one];
          }
          result += satangStr + 'สตางค์';
        } else {
          result += 'ถ้วน';  // ← แก้ตรงนี้ให้ชัวร์ ใส่ "ถ้วน" เสมอเมื่อไม่มีสตางค์
        }

        return result;
      }

      return Buffer.from(pdfBuffer);
    } catch (error) {
      throw new Error(`Failed to generate PDF: ${error.message}`);
    }
  }

  // ========================= DUPLICATE =========================
  async duplicate(id: number): Promise<Pr> {
    const original = await this.prRepository.findOne({
      where: { id },
      relations: ['items', 'job'],
    });

    if (!original) {
      throw new NotFoundException('PR ไม่พบ');
    }

    if (original.status !== PrStatus.DRAFT) {
      throw new BadRequestException('สามารถคัดลอกได้เฉพาะเอกสารที่อยู่ในสถานะฉบับร่าง (DRAFT) เท่านั้น');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const duplicate = new Pr();

      duplicate.prNumber = await this.generatePrNumber(queryRunner);

      duplicate.requester = original.requester;
      duplicate.jobNote = original.jobNote;
      duplicate.extraCharge = original.extraCharge;
      duplicate.depart = original.depart;
      duplicate.requestDate = original.requestDate;
      duplicate.requiredDate = original.requiredDate;
      duplicate.deliveryLocation = original.deliveryLocation;
      duplicate.remark = original.remark;
      duplicate.paymentMethod = original.paymentMethod;
      duplicate.supplier = original.supplier;
      duplicate.supplierId = original.supplierId;
      duplicate.currency = original.currency;
      duplicate.discountType = original.discountType;
      duplicate.discountValue = original.discountValue;
      duplicate.job = original.job;
      duplicate.jobId = original.jobId;

      // คำนวณยอดเงินใหม่
      const subtotal = original.items.reduce((sum, item) => sum + (item.quantity * (item.unitPrice ?? 0)), 0);
      const discountAmount = subtotal * ((original.discountPercent ?? 0) / 100);
      const subAfterDiscount = subtotal - discountAmount;
      const withholdingAmount = subAfterDiscount * ((original.withholdingPercent ?? 3) / 100);
      const subAfterWithholding = subAfterDiscount - withholdingAmount;
      const vatAmount = subAfterWithholding * ((original.vatPercent ?? 7) / 100);
      duplicate.grandTotal = subAfterWithholding + vatAmount;

      duplicate.vatPercent = original.vatPercent ?? 7;
      duplicate.discountPercent = original.discountPercent ?? 0;
      duplicate.withholdingPercent = original.withholdingPercent ?? 3;

      duplicate.status = PrStatus.DRAFT;

      duplicate.items = original.items?.map((item) =>
        queryRunner.manager.create(PrItem, {
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
        })
      ) || [];

      duplicate.approvals = [];

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

  async addAttachments(id: number, files: Express.Multer.File[]): Promise<Pr> {
    // 1. โหลด PR พร้อม attachments เดิมมาด้วย
    const pr = await this.prRepository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['attachments'] // ✅ เพิ่ม relations
    });

    if (!pr) throw new NotFoundException('PR ไม่พบ');

    if (files && files.length > 0) {
      // เรียกใช้ Repository ของ PrAttachment ผ่าน DataSource
      const attachmentRepo = this.dataSource.getRepository(PrAttachment);

      // 2. สร้าง Entity Instance (แทน Object ธรรมดา)
      const newAttachments = files.map(file => {
        return attachmentRepo.create({
          pr: pr, // ✅ ผูก Relation กลับไปหา PR
          fileName: file.filename,
          originalFileName: file.originalname,
          filePath: file.path,
          mimeType: file.mimetype,
          fileSize: file.size,
          uploadedAt: new Date(),
        });
      });

      // 3. บันทึกไฟล์ใหม่ลง Database
      await attachmentRepo.save(newAttachments);

      // 4. อัปเดตลิสต์ในตัวแปร pr เพื่อส่งคืนหน้าบ้าน (เอาของเก่า + ของใหม่)
      pr.attachments = [...(pr.attachments || []), ...newAttachments];
    }

    // ไม่ต้อง save pr ซ้ำก็ได้ เพราะเรา save attachments ไปแล้ว (หรือถ้าอยาก update timestamp ของ pr ก็ save ได้ครับ)
    return pr;
  }
}
