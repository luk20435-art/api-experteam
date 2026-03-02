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
import { Wr, WrStatus } from './entity/wr.entity';
import { WrItem } from './entity/wr-item.entity';
import { WrAttachment } from './entity/wr-attachment.entity';
import { Job } from '../job/entity/job.entity';
import { CreateWRDto } from './dto/create-wr.dto';
import { UpdateWRDto } from './dto/update-wr.dto';
import puppeteer from 'puppeteer';
import * as ejs from 'ejs';
import path from 'path';
import * as fs from 'fs';
import { Depart } from '../depart/entity/depart.entity';
import { Supplier } from '../supplier/entity/supplier.entity';
import bahttext from 'thai-baht-text';

@Injectable()
export class WrService {
  constructor(
    @InjectRepository(Wr)
    private readonly wrRepository: Repository<Wr>,
    @InjectRepository(WrAttachment)
    private readonly wrAttachmentRepository: Repository<WrAttachment>,
    @InjectRepository(Job)
    private readonly jobRepository: Repository<Job>,
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,
    @InjectRepository(Depart)
    private readonly departRepository: Repository<Depart>,
    private readonly dataSource: DataSource,
  ) { }

  private async generateWRNumber(queryRunner: QueryRunner): Promise<string> {
    const yearShort = new Date().getFullYear().toString().slice(-2);

    const result = await queryRunner.manager.query(
      `
      SELECT "wrNumber"
      FROM "wr"
      WHERE "wrNumber" LIKE $1
      ORDER BY "wrNumber" DESC
      LIMIT 1
      FOR UPDATE
      `,
      [`WR%/${yearShort}`],
    );

    let seq = 1;

    if (result.length > 0) {
      const lastNumber: string = result[0].wrNumber;
      const match = lastNumber.match(/WR(\d{4})\//);
      if (match) {
        seq = parseInt(match[1], 10) + 1;
      }
    }

    return `WR${String(seq).padStart(4, '0')}/${yearShort}`;
  }

  // ========================= CREATE =========================
  async create(createWRDto: CreateWRDto): Promise<Wr> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. หา Job
      let job: Job | null = null;
      if (createWRDto.jobId) {
        job = await queryRunner.manager.findOne(Job, { where: { id: createWRDto.jobId } });
        if (!job) throw new NotFoundException('Job ไม่พบ');
      }

      let supplierEntity: Supplier | null = null;
      if (createWRDto.supplierId) {
        supplierEntity = await queryRunner.manager.findOne(Supplier, { where: { id: createWRDto.supplierId } });
      }

      // 2. หา Depart
      let departEntity: Depart | null = null;
      if (createWRDto.departId) {
        departEntity = await queryRunner.manager.findOne(Depart, { where: { id: createWRDto.departId } });
      }

      const wr = new Wr();

      // --- Mapping ข้อมูลหลัก ---
      wr.wrNumber = await this.generateWRNumber(queryRunner);
      wr.requester = createWRDto.requester.trim();
      wr.jobNote = createWRDto.jobNote || '';
      wr.extraCharge = createWRDto.extraCharge ?? false;

      // --- Mapping แผนก (Corrected Syntax) ---
      wr.departId = departEntity?.id ? Number(departEntity.id) : undefined;
      wr.departName = departEntity?.departName || '';
      // wr.depart = departEntity?.departName || ''; // สำหรับ Legacy column

      // --- Mapping Supplier ---
      wr.supplierId = createWRDto.supplierId || undefined;
      wr.companyName = supplierEntity?.companyName || '';
      wr.supplier = supplierEntity?.companyName || '';
      // ถ้ามี Entity Supplier ให้ find เพื่อเอาชื่อมาเก็บใน wr.supplier ได้ที่นี่

      wr.status = (createWRDto.status || WrStatus.PENDING) as any;
      wr.requestDate = new Date(createWRDto.requestDate);
      wr.requiredDate = createWRDto.requiredDate ? new Date(createWRDto.requiredDate) : undefined;

      wr.deliveryLocation = createWRDto.deliveryLocation?.trim() || undefined;
      wr.remark = createWRDto.remark?.trim() || undefined;
      wr.paymentTerms = createWRDto.paymentTerms?.trim() || undefined;

      // เชื่อม Job
      wr.job = job || undefined;
      wr.jobId = job?.id || undefined;

      // --- Mapping รายการสินค้า ---
      if (createWRDto.items?.length) {
        wr.items = createWRDto.items.map((item) => {
          const wrItem = new WrItem();
          wrItem.description = item.description.trim();
          wrItem.quantity = item.quantity;
          wrItem.unit = item.unit?.trim() || 'ชิ้น';
          wrItem.unitPrice = item.unitPrice || 0;
          return wrItem;
        });
      }

      // บันทึก
      const savedWr = await queryRunner.manager.save(wr);

      await queryRunner.commitTransaction();
      return savedWr;

    } catch (err) {
      await queryRunner.rollbackTransaction();
      console.error('Error creating WR:', err); // ใส่ Log เพื่อดู Error จริงๆ
      if (err?.code === '23505') {
        throw new BadRequestException('เลข WR ซ้ำ กรุณาลองใหม่');
      }
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // ========================= UPDATE =========================
  async update(id: number, updateWRDto: UpdateWRDto): Promise<Wr> {
    const wr = await this.wrRepository.findOne({
      where: { id },
      relations: ['items', 'attachments'],
    });

    if (!wr) throw new NotFoundException('WR ไม่พบ');

    // 1. อัปเดตข้อมูลพื้นฐาน
    if (updateWRDto.requester !== undefined)
      wr.requester = updateWRDto.requester.trim();

    if (updateWRDto.jobNote !== undefined)
      wr.jobNote = updateWRDto.jobNote.trim();

    if (updateWRDto.extraCharge !== undefined)
      wr.extraCharge = updateWRDto.extraCharge;

    if (updateWRDto.status !== undefined)
      wr.status = updateWRDto.status as any;

    if (updateWRDto.deliveryLocation !== undefined)
      wr.deliveryLocation = updateWRDto.deliveryLocation?.trim() || undefined;

    if (updateWRDto.remark !== undefined)
      wr.remark = updateWRDto.remark?.trim() || undefined;

    // ⭐ 2. เพิ่มการอัปเดต Plan Type (ที่หายไป)
    if (updateWRDto['planType'] !== undefined) {
      wr['planType'] = updateWRDto['planType'];
    }

    // ⭐ 3. เพิ่มการอัปเดต Supplier (ที่หายไป)
    if (updateWRDto['supplierId'] !== undefined) {
      const supplierId = updateWRDto['supplierId'];
      const supplier = await this.dataSource.getRepository(Supplier).findOneBy({ id: supplierId });
      if (!supplier) throw new NotFoundException(`ไม่พบ Supplier ID: ${supplierId}`);

      wr['supplierId'] = supplier.id;
      wr['supplier'] = supplier.companyName; 
    }

    // ⭐ 4. อัปเดตแผนก (แก้ไขให้บันทึกลง Entity)
    if (updateWRDto['departId'] !== undefined) {
      const departId = updateWRDto['departId'];
      const depart = await this.dataSource.getRepository(Depart).findOneBy({ id: departId });
      if (!depart) throw new NotFoundException(`ไม่พบ Depart ID: ${departId}`);

      wr['departId'] = depart.id;
      wr['department'] = depart.departName; // อัปเดตชื่อแผนกด้วยถ้ามีคอลัมน์นี้
    }

    // 5. จัดการวันที่ (ป้องกันเรื่อง Timezone)
    if (updateWRDto.requestDate)
      wr.requestDate = new Date(updateWRDto.requestDate);

    if (updateWRDto.requiredDate !== undefined)
      wr.requiredDate = updateWRDto.requiredDate ? new Date(updateWRDto.requiredDate) : undefined;

    // 6. จัดการ Items (ลบของเก่า สร้างของใหม่)
    if (updateWRDto.items !== undefined) {
      if (wr.items?.length) {
        await this.dataSource.manager.remove(wr.items);
      }

      wr.items = updateWRDto.items.map((item) =>
        this.dataSource.manager.create(WrItem, {
          // ⭐ เพิ่ม name ให้ด้วยเพื่อป้องกัน Error NOT NULL
          name: item.description.trim(),
          description: item.description.trim(),
          quantity: item.quantity,
          unit: item.unit?.trim() || 'ชิ้น',
          unitPrice: item.unitPrice || 0,
          totalPrice: (item.quantity || 0) * (item.unitPrice || 0)
        }),
      );
    }

    // 7. บันทึกทุกอย่างลงฐานข้อมูล
    return this.wrRepository.save(wr);
  }

  // ========================= QUERY =========================
  async findAll(): Promise<Wr[]> {
    return this.wrRepository.find({
      where: { deletedAt: IsNull() },
      relations: ['job', 'items', 'depart', 'attachments'],
      order: { id: 'DESC' },
    });
  }

  async findTrashed(): Promise<Wr[]> {
    return this.wrRepository.find({
      where: { deletedAt: Not(IsNull()) },
      withDeleted: true,
      relations: ['job', 'items', 'depart', 'attachments'],
      order: { deletedAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Wr> {
    const wr = await this.wrRepository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['job', 'items', 'depart', 'attachments'],
    });
    if (!wr) throw new NotFoundException('WR ไม่พบ');
    return wr;
  }

  async findByKey(key: string): Promise<Wr[]> {
    if (!key) throw new BadRequestException('กรุณาระบุคำค้นหา');

    return this.wrRepository.find({
      where: [
        { wrNumber: Like(`%${key}%`) },
        { requester: Like(`%${key}%`) },
        { job: { jobNo: Like(`%${key}%`) } },
      ],
      relations: ['job', 'items', 'depart', 'attachments'],
    });
  }

  async addAttachments(id: number, files: Express.Multer.File[]): Promise<Wr> {
    const wr = await this.wrRepository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['attachments'],
    });
    if (!wr) throw new NotFoundException('WR not found');

    if (files?.length) {
      const attachments = files.map((file) =>
        this.wrAttachmentRepository.create({
          fileName: file.filename,
          originalFileName: file.originalname,
          filePath: file.path,
          mimeType: file.mimetype,
          fileSize: file.size,
          uploadedAt: new Date(),
          wr,
        }),
      );
      await this.wrAttachmentRepository.save(attachments);
      wr.attachments = [...(wr.attachments || []), ...attachments];
    }

    return wr;
  }

  async approve(id: number, email: string): Promise<Wr> {
    const wr = await this.wrRepository.findOne({
      where: { id },
    });

    if (!wr) {
      throw new NotFoundException('WR ไม่พบ');
    }

    if (wr.status !== 'pending') {
      throw new BadRequestException(
        'สามารถอนุมัติได้เฉพาะ WR ที่มีสถานะ pending เท่านั้น',
      );
    }

    wr.status = 'approved' as any;

    return this.wrRepository.save(wr);
  }

  // ========================= DELETE =========================
  async softDelete(id: number): Promise<void> {
    const result = await this.wrRepository.softDelete(id);
    if (result.affected === 0)
      throw new NotFoundException('WR ไม่พบ');
  }

  async restore(id: number): Promise<Wr> {
    const result = await this.wrRepository.restore(id);
    if (result.affected === 0)
      throw new NotFoundException('ไม่พบ WR ในถังขยะ');
    return this.findOne(id);
  }

  async forceDelete(id: number): Promise<void> {
    const result = await this.wrRepository.delete(id);
    if (result.affected === 0)
      throw new NotFoundException('WR ไม่พบ');
  }

  // ========================= GENERATE PDF =========================
  async generateWrPdf(id: number): Promise<Buffer> {
    const wr = await this.findOne(id);

    // คำนวณยอดรวมอย่างปลอดภัย
    const subTotal = wr.items.reduce((sum, i) => {
      const quantity = Number(i.quantity) || 0;
      const unitPrice = Number(i.unitPrice) || 0;
      return sum + quantity * unitPrice;
    }, 0);

    const withholdingPercent = Number(wr.withholdingPercent) || 3;
    const withholding = subTotal * (withholdingPercent / 100);
    const subAfterWithholding = subTotal - withholding;
    const vatPercent = Number(wr.vatPercent) || 7;
    const vat = subAfterWithholding * (vatPercent / 100);
    const grandTotal = subAfterWithholding + vat;

    const subTotalText = bahttext(subTotal);
    const withholdingText = bahttext(withholding);
    const vatText = bahttext(vat);
    const grandTotalText = bahttext(grandTotal);

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
    const itemsWithTotal = wr.items?.map(item => {
      const qty = Number(item.quantity || 0);
      const price = Number(item.unitPrice || 0);
      const total = qty * price;
      return { ...item, quantity: qty, unitPrice: price, calculatedTotal: total };
    }) || [];

    // เตรียมข้อมูลสำหรับ EJS — เพิ่มทุกตัวแปรที่ template อาจเรียกใช้
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

      // เลขที่เอกสาร (รองรับหลายชื่อที่ template อาจใช้)
      wrNumber: wr.wrNumber,
      prNumber: wr.wrNumber,
      poNumber: wr.wrNumber,

      // วันที่
      date: wr.requestDate,
      requiredDate: wr.requiredDate || '',

      // ข้อมูลงานและผู้ขอ
      jobName: wr.job?.jobName || 'Administration',
      jobNo: wr.job?.jobNo || wr.jobId?.toString() || 'AM',
      projectCode: wr.job?.projectCode || '009.003-xxx/25',
      ccNo: wr.job?.ccNo || 'AM/22-01/2025',
      depart: wr.departName || '',
      purchaseBy: wr.requester || 'ยังไม่ระบุ',
      requester: wr.requester || 'ยังไม่ระบุ',
      jobNote: wr.jobNote ?? '',
      extraCharge: wr.extraCharge ?? false,

      // สถานที่ส่งของ / ผู้ขาย
      deliveryLocation: wr.deliveryLocation || 'ยังไม่ระบุ',
      trader: wr.supplier || 'ไม่ระบุ',

      // หมายเหตุและเงื่อนไข
      remark: wr.remark || '',
      paymentTerms: wr.paymentTerms || '',

      // รายการสินค้า
      items: wr.items && wr.items.length > 0
        ? wr.items.map((item) => {
          const quantity = Number(item.quantity) || 0;
          const unitPrice = Number(item.unitPrice) || 0;
          const amount = quantity * unitPrice;

          return {
            description: item.description || item.name || '',
            quantity,
            unit: item.unit || 'PCS',
            unitPrice,
            amount,
          };
        })
        : [],

      // ยอดเงิน
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

      // ลายเซ็น
      sig1: wr.approvals?.[0]?.signatureImage || '',
      sig2: wr.approvals?.[1]?.signatureImage || '',
      sig3: wr.approvals?.[2]?.signatureImage || '',

      // อื่นๆ
      page: '1/1',
      formCode: 'FP.PU01-003.PR:01/07/2012 Rev.00',
    };

    const templatePath = path.join(process.cwd(), 'templates', 'work-request.ejs');

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
      console.error('PDF Generation Error:', error);
      throw new Error(`Failed to generate PDF: ${error.message}`);
    }
  }

  // ========================= DUPLICATE =========================
  async duplicate(id: number): Promise<Wr> {
    const original = await this.wrRepository.findOne({
      where: { id },
      relations: ['items', 'job'],
    });

    if (!original) {
      throw new NotFoundException('WR ไม่พบ');
    }

    // คัดลอกได้เฉพาะ DRAFT เท่านั้น
    if (original.status !== WrStatus.DRAFT) {
      throw new BadRequestException('สามารถคัดลอกได้เฉพาะเอกสารที่อยู่ในสถานะฉบับร่าง (DRAFT) เท่านั้น');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const duplicate = new Wr();

      // สร้างเลขใหม่
      duplicate.wrNumber = await this.generateWRNumber(queryRunner);

      // คัดลอกข้อมูลเดิม
      duplicate.requester = original.requester;
      duplicate.jobNote = original.jobNote;
      duplicate.extraCharge = original.extraCharge;
      duplicate.depart = original.depart;
      duplicate.requestDate = original.requestDate;
      duplicate.requiredDate = original.requiredDate;
      duplicate.deliveryLocation = original.deliveryLocation;
      duplicate.remark = original.remark;
      duplicate.paymentTerms = original.paymentTerms;
      duplicate.job = original.job;
      duplicate.jobId = original.jobId;

      // ตั้งสถานะเป็น DRAFT
      duplicate.status = WrStatus.DRAFT;

      // คัดลอก items
      duplicate.items = original.items?.map((item) =>
        queryRunner.manager.create(WrItem, {
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
        })
      ) || [];

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
