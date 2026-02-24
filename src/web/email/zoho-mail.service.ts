import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

type MailAttachment = NonNullable<nodemailer.SendMailOptions['attachments']>[number];

@Injectable()
export class ZohoMailService {
  private readonly logger = new Logger(ZohoMailService.name);
  private transporter: Transporter;

  constructor() {
    const host = process.env.ZOHO_SMTP_HOST || 'smtp.zoho.com';
    const port = parseInt(process.env.ZOHO_SMTP_PORT || '587', 10);
    const user = process.env.ZOHO_SMTP_USER;
    const pass = process.env.ZOHO_SMTP_PASS;

    if (!user || !pass) {
      this.logger.error(
        'Variables de entorno de Zoho SMTP no configuradas. ' +
        'Asegúrate de configurar ZOHO_SMTP_USER y ZOHO_SMTP_PASS'
      );
      throw new Error(
        'Zoho SMTP credentials not configured. Please set ZOHO_SMTP_USER and ZOHO_SMTP_PASS environment variables.'
      );
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: false,
      auth: {
        user,
        pass,
      },
    });
  }

  async sendMail(
    to: string,
    subject: string,
    htmlBody: string,
    attachments?: Array<{ name: string; contentBytes: string; contentType: string }>,
    inlineImages?: Array<{ cid: string; buffer: Buffer; contentType: string; filename: string }>,
  ): Promise<{ ok: boolean; to: string; attachmentsCount: number }> {
    const from = process.env.MAIL_FROM || process.env.ZOHO_SMTP_USER;
    const fromName = process.env.MAIL_FROM_NAME || 'Pool & Chill';

    const allAttachments: MailAttachment[] = [];

    if (attachments && attachments.length > 0) {
      for (const att of attachments) {
        allAttachments.push({
          filename: att.name,
          content: Buffer.from(att.contentBytes, 'base64'),
          contentType: att.contentType,
        });
      }
    }

    if (inlineImages && inlineImages.length > 0) {
      for (const img of inlineImages) {
        allAttachments.push({
          filename: img.filename,
          content: img.buffer,
          contentType: img.contentType,
          cid: img.cid,
        });
      }
    }

    const mailOptions: nodemailer.SendMailOptions = {
      from: `"${fromName}" <${from}>`,
      to,
      subject,
      html: htmlBody,
      attachments: allAttachments.length > 0 ? allAttachments : undefined,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      return { ok: true, to, attachmentsCount: allAttachments.length };
    } catch (error) {
      this.logger.error(`Error al enviar email a ${to}: ${error.message}`, error.stack);
      throw error;
    }
  }
}
