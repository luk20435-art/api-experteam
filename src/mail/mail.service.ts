import { Injectable } from '@nestjs/common';

@Injectable()
export class MailService {
  async sendMail(to: string, subject: string, body: string) {
    // ตัวอย่าง: แค่ log แทนการส่งจริง
    console.log(`Sending mail to ${to}: ${subject}\n${body}`);
  }
}
