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
import { Wo, WOStatus } from './entity/wo.entity';
import { WoItem } from './entity/wo-item.entity';
import { WoAttachment } from './entity/wo-attachment.entity';
import { CreateWODto } from './dto/create-wo.dto';
import { UpdateWODto } from './dto/update-wo.dto';
import { Wr } from '../wr/entity/wr.entity';

import puppeteer from 'puppeteer';
import * as ejs from 'ejs';
import path from 'path';
import * as fs from 'fs';
import bahttext from 'thai-baht-text';

@Injectable()
export class WoService {
  constructor(
    @InjectRepository(Wo)
    private readonly woRepository: Repository<Wo>,
    @InjectRepository(WoAttachment)
    private readonly woAttachmentRepository: Repository<WoAttachment>,
    private readonly dataSource: DataSource,
  ) { }

  /** Generate WO number in format 0000/YY (Gregorian year short). */
  private async generateWoNumber(queryRunner: QueryRunner): Promise<string> {
    const currentYear = new Date().getFullYear();
    const yearFull = String(currentYear);
    const yearShort = yearFull.slice(-2);

    // Lock candidate rows to reduce race conditions when creating numbers concurrently.
    const candidateRows = await queryRunner.manager
      .createQueryBuilder(Wo, 'wo')
      .where(
        '(wo.woNumber LIKE :newFormat OR wo.woNumber LIKE :legacyFormat)',
        {
          newFormat: `%/${yearFull}`,
          legacyFormat: `%/${yearShort}%`,
        },
      )
      .setLock('pessimistic_write')
      .getMany();

    let nextSeq = 1;
    for (const row of candidateRows) {
      const value = row.woNumber || '';
      // Supports both legacy: WO0004/26-03 and new: 0004/2026
      const match = value.match(/^(?:WO)?(\d{4})\/(\d{2,4})(?:-\d{2})?$/);
      if (!match) continue;

      const seq = Number(match[1]);
      const yearToken = match[2];
      const isCurrentYear =
        yearToken === yearFull || yearToken === yearShort;

      if (isCurrentYear && Number.isFinite(seq) && seq >= nextSeq) {
        nextSeq = seq + 1;
      }
    }

    return `${String(nextSeq).padStart(4, '0')}/${yearShort}`;
  }

  async create(createWODto: CreateWODto): Promise<Wo> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let wr: Wr | null = null;
      if (createWODto.wrId) {
        wr = await queryRunner.manager.findOne(Wr, {
          where: { id: createWODto.wrId },
        });
          if (!wr) throw new NotFoundException('WR เนเธกเนเธเธ');
      }

      const wo = new Wo();

      wo.woNumber = await this.generateWoNumber(queryRunner);

      wo.wr = wr || undefined;
      wo.wrId = wr?.id;
      wo.orderDate = new Date(createWODto.orderDate);
      wo.requester = createWODto.requester.trim();
      wo.deliveryLocation = createWODto.deliveryLocation?.trim() || undefined;
      wo.paymentTerms = createWODto.paymentTerms?.trim() || undefined;
      wo.currency = createWODto.currency || 'THB';
      wo.status = (createWODto.status ?? WOStatus.PENDING) as WOStatus;

      wo.items =
        createWODto.items?.map((item) =>
          queryRunner.manager.create(WoItem, {
            description: item.description.trim(),
            quantity: item.quantity,
            unit: item.unit?.trim() || 'ชิ้น',
            unitPrice: item.unitPrice || 0,
          }),
        ) || [];

      const saved = await queryRunner.manager.save(wo);

      await queryRunner.commitTransaction();
      return saved;
    } catch (err: any) {
      await queryRunner.rollbackTransaction();

      if (err.code === '23505') {
        throw new BadRequestException('เน€เธฅเธ WO เธเนเธณ เธเธฃเธธเธ“เธฒเธฅเธญเธเนเธซเธกเน');
      }

      throw new BadRequestException(err.message);
    } finally {
      await queryRunner.release();
    }
  }

  async update(id: number, updateWoDto: UpdateWODto): Promise<Wo> {
    const wo = await this.woRepository.findOne({
      where: { id },
      relations: ['items', 'approvals'],
    });

    if (!wo) throw new NotFoundException('ไม่พบ WO');

    if (updateWoDto.requester !== undefined) wo.requester = updateWoDto.requester.trim();
    if (updateWoDto.orderDate !== undefined) wo.orderDate = new Date(updateWoDto.orderDate);
    if (updateWoDto.deliveryDate !== undefined) {
      wo.deliveryDate = updateWoDto.deliveryDate ? new Date(updateWoDto.deliveryDate) : undefined;
    }
    if (updateWoDto.deliveryLocation !== undefined) wo.deliveryLocation = updateWoDto.deliveryLocation?.trim() || undefined;
    if (updateWoDto.remark !== undefined) wo.remark = updateWoDto.remark?.trim() || undefined;
    if (updateWoDto.paymentTerms !== undefined) wo.paymentTerms = updateWoDto.paymentTerms?.trim() || undefined;
    if (updateWoDto.currency !== undefined) wo.currency = updateWoDto.currency || 'THB';
    if (updateWoDto.status !== undefined) wo.status = updateWoDto.status as WOStatus;

    if (updateWoDto.items !== undefined) {
      if (wo.items?.length) {
        await this.dataSource.manager.remove(wo.items);
      }

      wo.items = updateWoDto.items.map((item) => {
        const woItem = this.dataSource.manager.create(WoItem, {
          description: item.description.trim(),
          quantity: item.quantity,
            unit: item.unit?.trim() || 'ชิ้น',
          unitPrice: Number(item.unitPrice) || 0,
        });
        return woItem;
      });
    }

    return this.woRepository.save(wo);
  }

  async findAll(): Promise<Wo[]> {
    return this.woRepository.find({
      where: { deletedAt: IsNull() },
      relations: ['items', 'wr', 'wr.job', 'approvals', 'attachments'],
      order: { id: 'DESC' },
    });
  }

  async findTrashed(): Promise<Wo[]> {
    return this.woRepository.find({
      where: { deletedAt: Not(IsNull()) },
      withDeleted: true,
      relations: ['items', 'wr', 'wr.job', 'approvals', 'attachments'],
      order: { deletedAt: 'DESC' },
    });
  }

  async findByKey(key: string): Promise<Wo[]> {
    if (!key) throw new BadRequestException('เธเธฃเธธเธ“เธฒเธฃเธฐเธเธธ key เธชเธณเธซเธฃเธฑเธเธเธฒเธฃเธเนเธเธซเธฒ');

    return this.woRepository.find({
      where: [
        { woNumber: Like(`%${key}%`) },
        { requester: Like(`%${key}%`) },
        { remark: Like(`%${key}%`) },
        { wr: { wrNumber: Like(`%${key}%`) } },
      ],
      relations: ['wr', 'wr.job', 'items', 'approvals', 'attachments'],
    });
  }

  async findOne(id: number): Promise<Wo> {
    const wo = await this.woRepository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['items', 'wr', 'wr.job', 'approvals', 'attachments'],
    });
    if (!wo) throw new NotFoundException('WO เนเธกเนเธเธ');
    return wo;
  }

  async addAttachments(id: number, files: Express.Multer.File[]): Promise<Wo> {
    const wo = await this.woRepository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['attachments'],
    });
    if (!wo) throw new NotFoundException('WO not found');

    if (files?.length) {
      const attachments = files.map((file) =>
        this.woAttachmentRepository.create({
          fileName: file.filename,
          originalFileName: file.originalname,
          filePath: file.path,
          mimeType: file.mimetype,
          fileSize: file.size,
          uploadedAt: new Date(),
          wo,
        }),
      );
      await this.woAttachmentRepository.save(attachments);
      wo.attachments = [...(wo.attachments || []), ...attachments];
    }

    return wo;
  }
  async approve(id: number): Promise<Wo> {
    const wo = await this.findOne(id);

    if (wo.status !== WOStatus.PENDING) {
      throw new BadRequestException('เธชเธฒเธกเธฒเธฃเธ–เธญเธเธธเธกเธฑเธ•เธดเนเธ”เนเน€เธเธเธฒเธฐเธชเธ–เธฒเธเธฐเธฃเธญเธญเธเธธเธกเธฑเธ•เธดเน€เธ—เนเธฒเธเธฑเนเธ');
    }

    wo.status = WOStatus.APPROVED;
    return this.woRepository.save(wo);
  }

  async reject(id: number): Promise<Wo> {
    const wo = await this.findOne(id);

    if (wo.status !== WOStatus.PENDING) {
      throw new BadRequestException('เธชเธฒเธกเธฒเธฃเธ–เธเธเธดเน€เธชเธเนเธ”เนเน€เธเธเธฒเธฐเธชเธ–เธฒเธเธฐเธฃเธญเธญเธเธธเธกเธฑเธ•เธดเน€เธ—เนเธฒเธเธฑเนเธ');
    }

    wo.status = WOStatus.REJECTED;
    return this.woRepository.save(wo);
  }

  async softDelete(id: number): Promise<void> {
    const result = await this.woRepository.softDelete(id);
    if (result.affected === 0) throw new NotFoundException('WO เนเธกเนเธเธ');
  }

  async restore(id: number): Promise<Wo> {
    const result = await this.woRepository.restore(id);
    if (result.affected === 0) throw new NotFoundException('เนเธกเนเธเธ WO เนเธเธ–เธฑเธเธเธขเธฐ');
    return this.findOne(id);
  }

  async forceDelete(id: number): Promise<void> {
    const result = await this.woRepository.delete(id);
    if (result.affected === 0) throw new NotFoundException('WO เนเธกเนเธเธ');
  }

  async generateWoPdf(id: number): Promise<Buffer> {
    const wo = await this.findOne(id);

    const subTotal = wo.items.reduce((sum, i) => {
      const quantity = Number(i.quantity) || 0;
      const unitPrice = Number(i.unitPrice) || 0;
      return sum + quantity * unitPrice;
    }, 0);

    const withholdingPercent = 3;
    const withholding = subTotal * (withholdingPercent / 100);
    const subAfterWithholding = subTotal - withholding;
    const vatPercent = 7;
    const vat = subAfterWithholding * (vatPercent / 100);
    const grandTotal = subAfterWithholding + vat;

    const subTotalText = bahttext(subTotal);
    const withholdingText = bahttext(withholding);
    const vatText = bahttext(vat);
    const grandTotalText = bahttext(grandTotal);

    const wr = wo.wr;
    const job = wr?.job;

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

    const itemsWithTotal = wo.items?.map(item => {
      const qty = Number(item.quantity || 0);
      const price = Number(item.unitPrice || 0);
      const total = qty * price;
      return { ...item, quantity: qty, unitPrice: price, calculatedTotal: total };
    }) || [];

    const data = {
      logo: getImage('logo.jpg'),
      logos: { experteam: getImage('logo.jpg') },
      companyName: 'EXPERTEAM COMPANY LIMITED',
      companyNameTh: 'บริษัท เอ็กเพิททีม จำกัด',
      companyAddress: 'เลขที่ 1110,112,114 ถนนพระราม 2 แขวงแสมดำ เขตบางขุนเทียน กรุงเทพมหานคร 10150 เลขประจำตัวผู้เสียภาษี 0 1055 35151 77 6',
      phone: '02-9896001',
      fax: '02-986451',
      email: 'extec@experteam.co.th',
      website: 'www.experteam.co.th',

      woNumber: wo.woNumber,
      prNumber: wr?.wrNumber || '-',
      date: wo.orderDate ? new Date(wo.orderDate).toLocaleDateString('th-TH') : '',
      jobName: job?.jobName || 'Administration',
      jobNo: job?.jobNo || 'AM',
      projectCode: job?.ccNo?.split('/')[1] || 'P062.002-001/25',
      ccNo: job?.ccNo || 'AM/22-01/2025',
      trader: job?.trader || 'ไม่ระบุ',
      deliveryLocation: wr?.deliveryLocation || 'ยังไม่ระบุ',
      purchaseBy: wr?.requester || 'ยังไม่ระบุ',
      remark: wo.remark || 'ยังไม่ระบุ',

      items: wo.items && wo.items.length > 0
        ? wo.items.map((item) => ({
          description: item.description || '',
          quantity: Number(item.quantity) || 0,
          unit: item.unit || 'ชิ้น',
          unitPrice: Number(item.unitPrice) || 0,
          amount: (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
        }))
        : [],

      subTotal: Number(subTotal).toFixed(2),
      withholdingPercent,
      withholding: Number(withholding).toFixed(2),
      subAfterWithholding: Number(subAfterWithholding).toFixed(2),
      vatPercent,
      vat: Number(vat).toFixed(2),
      grandTotal: Number(grandTotal).toFixed(2),

      subTotalText,
      withholdingText,
      vatText,
      grandTotalText,

      sig1: wo.approvals?.[0]?.approverEmail || '',
      sig2: wo.approvals?.[1]?.approverEmail || '',
      sig3: wo.approvals?.[2]?.approverEmail || '',

      page: '1/1',
      formCode: 'FP.PU01-003.PR:01/07/2012 Rev.00',
    };

    const templatePath = path.join(process.cwd(), 'templates', 'work-o.ejs');

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
        margin: {
          top: '10mm',
          bottom: '10mm',
          left: '10mm',
          right: '10mm',
        },
      });

      await browser.close();
      return Buffer.from(pdfBuffer);
    } catch (error) {
      console.error('PDF Generation Error:', error);
      throw new Error(`Failed to generate PDF: ${error.message}`);
    }
  }

  // ========================= DUPLICATE =========================
  async duplicate(id: number): Promise<Wo> {
    const original = await this.woRepository.findOne({
      where: { id },
      relations: ['items', 'wr', 'wr.job', 'wr.items'],
    });

    if (!original) {
      throw new NotFoundException('ไม่พบ WO ต้นฉบับ');
    }

    if (original.status !== WOStatus.DRAFT) {
      throw new BadRequestException('เฉพาะ WO ที่สถานะเป็น DRAFT เท่านั้นถึงจะทำซ้ำได้');
    }

    const wr = original.wr;
    if (!wr) {
      throw new BadRequestException('ไม่สามารถทำซ้ำ WO ได้โดยไม่มี WR ที่เกี่ยวข้อง');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const duplicate = new Wo();

      duplicate.woNumber = await this.generateWoNumber(queryRunner);

      duplicate.wr = wr;
      duplicate.wrId = wr.id;
      duplicate.job = wr.job;
      duplicate.jobId = wr.jobId;
      duplicate.requester = wr.requester;
      duplicate.depart = wr.departName || '';
      duplicate.requestDate = wr.requestDate;
      duplicate.requiredDate = wr.requiredDate;
      duplicate.deliveryLocation = wr.deliveryLocation || '';
      duplicate.remark = wr.remark || '';
      duplicate.paymentTerms = wr.paymentTerms || '';

      duplicate.status = WOStatus.DRAFT;

      const items = wr.items || [];
      duplicate.items = items.map((item) =>
        queryRunner.manager.create(WoItem, {
          description: item.description || '',
          quantity: item.quantity,
          unit: item.unit || 'ชิ้น',
          unitPrice: item.unitPrice || 0,
        })
      );

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
}


