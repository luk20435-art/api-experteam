import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
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
import * as path from 'path';
import * as ejs from 'ejs';
import * as puppeteer from 'puppeteer';
import { Po, PoStatus } from './entity/po.entity';
import { PoItem } from './entity/po-item.entity';
import { PoApproval, PoApprovalStatus } from './entity/po-approvals.entity';
import { PoAttachment } from './entity/po-attachment.entity';
import { CreatePoDto } from './dto/create-po.dto';
import { UpdatePoDto } from './dto/update-po.dto';
import { PaymentMethod, Pr } from '../pr/entity/pr.entity';
import { UpdatePrDto } from '../pr/dto/update-pr.dto';
import * as fs from 'fs';
import bahttext from 'thai-baht-text';

@Injectable()
export class PoService {
  private static readonly PO_NUMBER_UNIQUE_CONSTRAINT =
    'UQ_7e64da0123000118fe532973d83';

  constructor(
    @InjectRepository(Po)
    private readonly poRepository: Repository<Po>,
    @InjectRepository(PoAttachment)
    private readonly poAttachmentRepository: Repository<PoAttachment>,
    @InjectRepository(Pr)
    private readonly prRepository: Repository<Pr>,
    private readonly dataSource: DataSource,
  ) { }

  /** เธชเธฃเนเธฒเธเน€เธฅเธ PO เธญเธฑเธ•เนเธเธกเธฑเธ•เธด - เนเธเนเนเธ transaction เน€เธเธทเนเธญเธเธงเธฒเธกเธเธฅเธญเธ”เธ เธฑเธข */
  private async generatePoNumber(queryRunner: QueryRunner): Promise<string> {
    console.log('๐”’ เน€เธฃเธดเนเธก generate PO Number เธเธฃเนเธญเธก pessimistic lock');

    const currentYear = new Date().getFullYear();
    const yearShort = String(currentYear).slice(-2);

    const lastPo = await queryRunner.manager
      .createQueryBuilder(Po, 'po')
      .withDeleted()
      .where('po.poNumber LIKE :pattern', { pattern: `%/${yearShort}` })
      .orderBy('po.poNumber', 'DESC')
      .setLock('pessimistic_write')
      .getOne();

    let nextSeq = 1;

    if (lastPo && lastPo.poNumber) {
      const match = lastPo.poNumber.match(/PO(\d{4})\//i);
      if (match && match[1]) {
        nextSeq = parseInt(match[1], 10) + 1;
      }
    }

    const newPoNumber = `PO${String(nextSeq).padStart(4, '0')}/${yearShort}`;
    console.log('โ… เธชเธฃเนเธฒเธ PO Number เธชเธณเน€เธฃเนเธ:', newPoNumber);

    return newPoNumber;
  }

  private isPoNumberUniqueViolation(error: any): boolean {
    return (
      error?.code === '23505' &&
      (error?.constraint === PoService.PO_NUMBER_UNIQUE_CONSTRAINT ||
        error?.detail?.includes('(poNumber)'))
    );
  }

  private calculateTotals(
    items: Array<{ quantity: number; unitPrice?: number }>,
    discountPercent: number,
    withholdingPercent: number,
    vatPercent: number,
  ) {
    const subTotal = items.reduce(
      (sum, item) => sum + (Number(item.quantity || 0) * Number(item.unitPrice || 0)),
      0,
    );
    const discount = subTotal * (Number(discountPercent || 0) / 100);
    const subAfterDiscount = subTotal - discount;
    const withholding = subAfterDiscount * (Number(withholdingPercent || 0) / 100);
    const subAfterWithholding = subAfterDiscount - withholding;
    const vat = subAfterWithholding * (Number(vatPercent || 0) / 100);
    const grandTotal = subAfterWithholding + vat;

    return {
      subTotal,
      discount,
      subAfterDiscount,
      withholding,
      subAfterWithholding,
      vat,
      grandTotal,
    };
  }

  async create(createPoDto: CreatePoDto): Promise<Po> {
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        const {
          prId,
          orderDate,
          deliveryDate,
          remark,
          paymentTerms,
          currency = 'THB',
          items = [],
          status = 'PENDING',
          tax,
          invoice,
          vatPercent,
          discountPercent,
          withholdingPercent,
        } = createPoDto;

        let pr: Pr | null = null;
        if (prId) {
          pr = await queryRunner.manager.findOne(Pr, {
            where: { id: prId },
            relations: ['items', 'approvals', 'job'],
          });
          if (!pr) {
            throw new NotFoundException('PR not found');
          }
          if (pr.status !== 'APPROVED') {
            throw new BadRequestException('PO can only be created from APPROVED PR');
          }
        }

        const poItems =
          items.length > 0
            ? items.map((i) => {
                const item = new PoItem();
                item.description = i.description ?? '';
                item.quantity = i.quantity;
                item.unit = i.unit || 'ชิ้น';
                item.unitPrice = i.unitPrice;
                return item;
              })
            : pr?.items.map((prItem) => {
                const item = new PoItem();
                item.description = prItem.description ?? '';
                item.quantity = prItem.quantity;
                item.unit = prItem.unit || 'ชิ้น';
                item.unitPrice = prItem.unitPrice || 0;
                return item;
              }) || [];

        const po = new Po();
        po.orderDate = new Date(orderDate);
        po.deliveryDate = deliveryDate ? new Date(deliveryDate) : undefined;
        po.remark = remark;
        po.paymentMethod =
          pr?.paymentMethod ??
          (paymentTerms ? PaymentMethod.CREDIT : PaymentMethod.CASH);
        po.currency = currency;
        po.pr = pr ?? undefined;
        po.prId = pr?.id ?? undefined;
        po.items = poItems;
        po.status = status as any;
        po.tax = tax;
        po.invoice = invoice;
        po.extraCharge = pr?.extraCharge ?? false;
        po.requester = pr?.requester;
        po.depart = pr?.depart;
        po.supplier = pr?.supplier;
        po.deliveryLocation = pr?.deliveryLocation;
        po.vatPercent = Number(vatPercent ?? pr?.vatPercent ?? 7);
        po.discountPercent = Number(discountPercent ?? pr?.discountPercent ?? 0);
        po.withholdingPercent = Number(withholdingPercent ?? pr?.withholdingPercent ?? 0);
        po.grandTotal = this.calculateTotals(
          poItems,
          po.discountPercent,
          po.withholdingPercent,
          po.vatPercent,
        ).grandTotal;
        po.poNumber = await this.generatePoNumber(queryRunner);

        if (pr && pr.approvals && pr.approvals.length > 0) {
          po.approvals = pr.approvals.map((prApproval) => {
            const poApproval = new PoApproval();
            poApproval.approverEmail = prApproval.approverEmail;
            poApproval.status = PoApprovalStatus.PENDING;
            poApproval.po = po;
            return poApproval;
          });
        }

        const savedPo = await queryRunner.manager.save(po);
        await queryRunner.commitTransaction();
        return savedPo;
      } catch (err: any) {
        await queryRunner.rollbackTransaction();

        if (this.isPoNumberUniqueViolation(err) && attempt < maxRetries) {
          continue;
        }

        if (this.isPoNumberUniqueViolation(err)) {
          throw new ConflictException('PO Number is duplicated. Please retry.');
        }

        throw err;
      } finally {
        await queryRunner.release();
      }
    }

    throw new ConflictException('Unable to allocate a unique PO Number. Please retry.');
  }

  async update(id: number, updatePoDto: UpdatePoDto): Promise<Po> {
    const po = await this.poRepository.findOne({
      where: { id },
      relations: ['items', 'pr'],
    });

    if (!po) throw new NotFoundException('PO ไม่พบ');

    // ✅ อัปเดต PO
    if (updatePoDto.orderDate !== undefined) po.orderDate = new Date(updatePoDto.orderDate);
    if (updatePoDto.deliveryDate !== undefined) po.deliveryDate = updatePoDto.deliveryDate ? new Date(updatePoDto.deliveryDate) : undefined;
    if (updatePoDto.remark !== undefined) po.remark = updatePoDto.remark;
    if (updatePoDto.paymentMethod !== undefined) po.paymentMethod = updatePoDto.paymentMethod;
    if (updatePoDto.currency !== undefined) po.currency = updatePoDto.currency;
    if (updatePoDto.status !== undefined) po.status = updatePoDto.status as Po['status'];
    if (updatePoDto.invoice !== undefined) po.invoice = updatePoDto.invoice;
    if (updatePoDto.tax !== undefined) po.tax = updatePoDto.tax;
    if (updatePoDto.vatPercent !== undefined) po.vatPercent = Number(updatePoDto.vatPercent);
    if (updatePoDto.discountPercent !== undefined) po.discountPercent = Number(updatePoDto.discountPercent);
    if (updatePoDto.withholdingPercent !== undefined) po.withholdingPercent = Number(updatePoDto.withholdingPercent);

    // ✅ อัปเดต PR (ถ้ามี pr data ใน payload)
    if (updatePoDto.pr && po.prId) {
      const prUpdateData: any = {};  // ✅ ใช้ any เพื่อหลีกเลี่ยง type error
      
      if (updatePoDto.pr.jobNote !== undefined) prUpdateData.jobNote = updatePoDto.pr.jobNote;
      if (updatePoDto.pr.extraCharge !== undefined) prUpdateData.extraCharge = updatePoDto.pr.extraCharge;
      if (updatePoDto.pr.planType !== undefined) prUpdateData.planType = updatePoDto.pr.planType;
      if (updatePoDto.pr.paymentMethod !== undefined) prUpdateData.paymentMethod = updatePoDto.pr.paymentMethod;
      if (updatePoDto.pr.paymentTerms !== undefined) prUpdateData.paymentTerms = updatePoDto.pr.paymentTerms;
      if (updatePoDto.pr.remark !== undefined) prUpdateData.remark = updatePoDto.pr.remark;
      if (updatePoDto.pr.currency !== undefined) prUpdateData.currency = updatePoDto.pr.currency;
      if (updatePoDto.pr.discountType !== undefined) prUpdateData.discountType = updatePoDto.pr.discountType;
      if (updatePoDto.pr.discountValue !== undefined) prUpdateData.discountValue = updatePoDto.pr.discountValue;

      await this.prRepository.update(po.prId, prUpdateData);
    }

    if (updatePoDto.items !== undefined) {
      if (po.items?.length) {
        await this.dataSource.manager.remove(po.items);
      }

      const newItems = updatePoDto.items.map((item) => {
        const poItem = new PoItem();
        poItem.description = item.description ?? '';
        poItem.quantity = item.quantity;
        poItem.unit = item.unit || '-';
        poItem.unitPrice = item.unitPrice ?? 0;
        poItem.po = po;
        poItem.poId = po.id;
        return poItem;
      });

      po.items = newItems;
    }

    po.grandTotal = this.calculateTotals(
      po.items || [],
      Number(po.discountPercent || 0),
      Number(po.withholdingPercent || 0),
      Number(po.vatPercent || 0),
    ).grandTotal;

    return await this.poRepository.save(po);
  }

  async findAll(): Promise<Po[]> {
    return this.poRepository.find({
      where: { deletedAt: IsNull() },
      relations: ['items', 'pr', 'pr.job', 'approvals', 'attachments'],
      order: { id: 'DESC' },
    });
  }

  async findTrashed(): Promise<Po[]> {
    return this.poRepository.find({
      where: { deletedAt: Not(IsNull()) },
      withDeleted: true,
      relations: ['items', 'pr', 'pr.job', 'approvals', 'attachments'],
      order: { deletedAt: 'DESC' },
    });
  }

  async findByKey(key: string): Promise<Po[]> {
    if (!key) throw new BadRequestException('เธเธฃเธธเธ“เธฒเธฃเธฐเธเธธ key เธชเธณเธซเธฃเธฑเธเธเธฒเธฃเธเนเธเธซเธฒ');

    return this.poRepository.find({
      where: [
        { poNumber: Like(`%${key}%`) },
        { remark: Like(`%${key}%`) },
        { pr: { prNumber: Like(`%${key}%`) } },
      ],
      relations: ['pr', 'pr.job', 'items', 'approvals', 'attachments'],
    });
  }

  async findOne(id: number): Promise<Po> {
    const po = await this.poRepository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['items', 'pr', 'pr.job', 'approvals', 'attachments'],
    });
    if (!po) throw new NotFoundException('PO เนเธกเนเธเธ');
    return po;
  }

  async softDelete(id: number): Promise<void> {
    const result = await this.poRepository.softDelete(id);
    if (result.affected === 0) throw new NotFoundException('PO เนเธกเนเธเธ');
  }

  async restore(id: number): Promise<Po> {
    const result = await this.poRepository.restore(id);
    if (result.affected === 0) throw new NotFoundException('เนเธกเนเธเธ PO เนเธเธ–เธฑเธเธเธขเธฐ');
    return this.findOne(id);
  }

  async forceDelete(id: number): Promise<void> {
    const result = await this.poRepository.delete(id);
    if (result.affected === 0) throw new NotFoundException('PO เนเธกเนเธเธ');
  }

  async generatePoPdf(id: number): Promise<Buffer> {
    const po = await this.findOne(id);
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

    // --- 3. เธเธณเธเธงเธ“เธขเธญเธ”เน€เธเธดเธ (เธเธฑเธเธเธฑเธเธเธณเธเธงเธ“เนเธซเธกเน) ---
    const itemsWithTotal = po.items?.map(item => {
      const qty = Number(item.quantity || 0);
      const price = Number(item.unitPrice || 0);
      const total = qty * price;
      return { ...item, quantity: qty, unitPrice: price, calculatedTotal: total };
    }) || [];

    const pr = po.pr;
    const withholdingPercent = Number(po.withholdingPercent ?? pr?.withholdingPercent ?? 0);
    const vatPercent = Number(po.vatPercent ?? pr?.vatPercent ?? 7);
    const discountPercent = Number(po.discountPercent ?? pr?.discountPercent ?? 0);
    const totals = this.calculateTotals(po.items || [], discountPercent, withholdingPercent, vatPercent);
    const subTotal = totals.subTotal;
    const withholding = totals.withholding;
    const subAfterWithholding = totals.subAfterWithholding;
    const vat = totals.vat;
    const grandTotal = totals.grandTotal;

    const subTotalText = bahttext(subTotal);
    const withholdingText = bahttext(withholding);
    const vatText = bahttext(vat);
    const grandTotalText = bahttext(grandTotal);

    const job = pr?.job;

    const data = {
      logo: getImage('logo.jpg'),
      logos: { experteam: getImage('logo.jpg') },
      companyName: 'EXPERTEAM COMPANY LIMITED',
      companyNameTh: 'เธเธฃเธดเธฉเธฑเธ— เน€เธญเนเธเน€เธเธดเธ—เธ—เธตเธก เธเธณเธเธฑเธ”',
      companyAddress: 'สำนักงานใหญ่ 1110,112,114 ถนนพระราม2 แขวงแสมดำ เขตบางขุนเทียน กรุงเทพมหานคร 10150 เลขที่ผู้เสียภาษี 0 1055 35151 77 6',
      phone: '02-9896001',
      fax: '02-986451',
      email: 'extec@experteam.co.th',
      website: 'www.experteam.co.th',

      poNumber: po.poNumber,
      date: new Date(po.orderDate).toLocaleDateString('th-TH'),
      jobName: job?.jobName || 'Administration',
      jobNo: job?.jobNo || 'AM',
      projectCode: job?.ccNo?.split('/')[1] || 'P062.002-001/25',
      ccNo: job?.ccNo || 'AM/22-01/2025',
      trader: job?.trader || 'เนเธกเนเธฃเธฐเธเธธ',
      deliveryLocation: po.pr?.deliveryLocation || 'เธขเธฑเธเนเธกเนเธฃเธฐเธเธธ',
      purchaseBy: pr?.requester || 'เธขเธฑเธเนเธกเนเธฃเธฐเธเธธ',

      items: po.items && po.items.length > 0 ? po.items.map((item) => ({
        description: item.description || '',
        quantity: item.quantity || 0,
        unit: item.unit || 'เธเธดเนเธ',
        unitPrice: Number(item.unitPrice ?? 0),
        amount: Number(item.quantity * (item.unitPrice ?? 0)),
      })) : [],

      subTotal: subTotal.toFixed(2),
      withholdingPercent: withholdingPercent,
      withholding: withholding.toFixed(2),
      subAfterWithholding: subAfterWithholding.toFixed(2),
      vatPercent: vatPercent,
      vat: vat.toFixed(2),
      grandTotal: grandTotal.toFixed(2),
      remark: po?.remark || 'เธขเธฑเธเนเธกเนเธฃเธฐเธเธธ',

      subTotalText,
      withholdingText,
      vatText,
      grandTotalText,

      sig1: po.approvals?.[0]?.approverEmail || '',
      sig2: po.approvals?.[1]?.approverEmail || '',
      sig3: po.approvals?.[2]?.approverEmail || '',

      page: '1/1',
      formCode: 'FP.PU01-003.PR:01/07/2012 Rev.00',
    };

    const templatePath = path.join(process.cwd(), 'templates', 'purchase-order.ejs');

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

      function bahttext(num: number): string {
        if (!Number.isFinite(num)) return 'เธจเธนเธเธขเนเธเธฒเธ—เธ–เนเธงเธ';
        if (num === 0) return 'เธจเธนเธเธขเนเธเธฒเธ—เธ–เนเธงเธ';

        const numbers = ['เธจเธนเธเธขเน', 'เธซเธเธถเนเธ', 'เธชเธญเธ', 'เธชเธฒเธก', 'เธชเธตเน', 'เธซเนเธฒ', 'เธซเธ', 'เน€เธเนเธ”', 'เนเธเธ”', 'เน€เธเนเธฒ'];
        const units = ['', 'เธชเธดเธ', 'เธฃเนเธญเธข', 'เธเธฑเธ', 'เธซเธกเธทเนเธ', 'เนเธชเธ', 'เธฅเนเธฒเธ'];
        const [baht, satang] = num.toFixed(2).split('.').map(Number);

        let bahtStr = '';
        if (baht > 0) {
          const digits = baht.toString().split('').reverse();
          for (let i = 0; i < digits.length; i++) {
            const d = Number(digits[i]);
            if (d === 0) continue;

            let text = numbers[d];
            if (i === 1) { // เธชเธดเธ
              text = d === 1 ? 'เธชเธดเธ' : (d === 2 ? 'เธขเธตเนเธชเธดเธ' : numbers[d] + 'เธชเธดเธ');
            } else if (i === 0 && d === 1 && digits.length > 1) {
              text = 'เน€เธญเนเธ”';
            }
            bahtStr = text + (i < 6 ? units[i] : (i % 6 === 0 ? 'เธฅเนเธฒเธ' : '')) + bahtStr;
          }
        } else {
          bahtStr = 'เธจเธนเธเธขเน';
        }

        let result = bahtStr + 'เธเธฒเธ—';

        if (satang > 0) {
          let satangStr = '';
          const sDigits = satang.toString().padStart(2, '0').split('');
          const ten = Number(sDigits[0]);
          const one = Number(sDigits[1]);

          if (ten > 0) {
            satangStr += ten === 1 ? 'เธชเธดเธ' : (ten === 2 ? 'เธขเธตเนเธชเธดเธ' : numbers[ten] + 'เธชเธดเธ');
          }
          if (one > 0) {
            satangStr += (one === 1 && ten > 0) ? 'เน€เธญเนเธ”' : numbers[one];
          }
          result += satangStr + 'เธชเธ•เธฒเธเธเน';
        } else {
          result += 'เธ–เนเธงเธ';  // โ เนเธเนเธ•เธฃเธเธเธตเนเนเธซเนเธเธฑเธงเธฃเน เนเธชเน "เธ–เนเธงเธ" เน€เธชเธกเธญเน€เธกเธทเนเธญเนเธกเนเธกเธตเธชเธ•เธฒเธเธเน
        }

        return result;
      }

    return Buffer.from(pdfBuffer);
    } catch (error) {
      console.error('PDF Generation Error:', error);
      throw new Error(`Failed to generate PDF: ${error.message}`);
    }
  }

  // ========================= DUPLICATE =========================
  async duplicate(id: number): Promise<Po> {
    const original = await this.poRepository.findOne({
      where: { id },
      relations: ['items', 'pr', 'pr.job', 'pr.items'],
    });

    if (!original) {
      throw new NotFoundException('PO not found');
    }

    if (original.status !== PoStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT PO can be duplicated');
    }

    const pr = original.pr;
    if (!pr) {
      throw new BadRequestException('This PO has no source PR');
    }

    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        const duplicate = new Po();
        duplicate.poNumber = await this.generatePoNumber(queryRunner);
        duplicate.orderDate = new Date();
        duplicate.deliveryDate = pr.requiredDate ? new Date(pr.requiredDate) : undefined;
        duplicate.remark = pr.remark || '';
        duplicate.paymentMethod = pr.paymentMethod || PaymentMethod.CASH;
        duplicate.currency = 'THB';

        duplicate.pr = pr;
        duplicate.prId = pr.id;
        duplicate.requester = pr.requester;
        duplicate.depart = pr.departName?.trim() || '';
        duplicate.requestDate = pr.requestDate ? pr.requestDate.toISOString().split('T')[0] : '';
        duplicate.requiredDate = pr.requiredDate ? pr.requiredDate.toISOString().split('T')[0] : undefined;
        duplicate.deliveryLocation = pr.deliveryLocation;
        duplicate.supplier = pr.supplier;
        duplicate.supplierId = pr.supplierId;
        duplicate.job = pr.job;
        duplicate.jobId = pr.jobId;

        const items = pr.items || [];
        const subtotal = items.reduce((sum, item) => {
          const quantity = Number(item.quantity) || 0;
          const unitPrice = Number(item.unitPrice) || 0;
          return sum + quantity * unitPrice;
        }, 0);

        const discountAmount = subtotal * ((pr.discountPercent ?? 0) / 100);
        const subAfterDiscount = subtotal - discountAmount;
        const withholdingAmount = subAfterDiscount * ((pr.withholdingPercent ?? 3) / 100);
        const subAfterWithholding = subAfterDiscount - withholdingAmount;
        const vatAmount = subAfterWithholding * ((pr.vatPercent ?? 7) / 100);
        duplicate.grandTotal = subAfterWithholding + vatAmount;

        duplicate.vatPercent = pr.vatPercent ?? 7;
        duplicate.discountPercent = pr.discountPercent ?? 0;
        duplicate.withholdingPercent = pr.withholdingPercent ?? 3;
        duplicate.status = PoStatus.DRAFT;

        duplicate.items = items.map((item) =>
          queryRunner.manager.create(PoItem, {
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
      } catch (err: any) {
        await queryRunner.rollbackTransaction();

        if (this.isPoNumberUniqueViolation(err) && attempt < maxRetries) {
          continue;
        }

        if (this.isPoNumberUniqueViolation(err)) {
          throw new ConflictException('PO Number is duplicated. Please retry.');
        }

        throw err;
      } finally {
        await queryRunner.release();
      }
    }

    throw new ConflictException('Unable to allocate a unique PO Number. Please retry.');
  }

  async addAttachments(id: number, files: Express.Multer.File[]): Promise<Po> {
    const po = await this.poRepository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['attachments'],
    });
    if (!po) throw new NotFoundException('PO not found');

    if (files?.length) {
      const attachments = files.map((file) =>
        this.poAttachmentRepository.create({
          fileName: file.filename,
          originalFileName: file.originalname,
          filePath: file.path,
          mimeType: file.mimetype,
          fileSize: file.size,
          uploadedAt: new Date(),
          po,
        }),
      );
      await this.poAttachmentRepository.save(attachments);
      po.attachments = [...(po.attachments || []), ...attachments];
    }

    return po;
  }
}
