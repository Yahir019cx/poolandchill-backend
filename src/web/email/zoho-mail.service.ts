import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class ZohoMailService {
  private readonly logger = new Logger(ZohoMailService.name);
  private readonly resend: Resend;
  private readonly from: string;

  constructor() {
    const apiKey = process.env.ResendApi;

    if (!apiKey) {
      this.logger.error(
        'Variable de entorno ResendApi no configurada.',
      );
      throw new Error(
        'Resend API key not configured. Please set ResendApi environment variable.',
      );
    }

    this.resend = new Resend(apiKey);
    this.from = 'Pool & Chill <no-reply@poolandchill.com.mx>';
  }

  async sendMail(
    to: string,
    subject: string,
    htmlBody: string,
    attachments?: Array<{ name: string; contentBytes: string; contentType: string }>,
    inlineImages?: Array<{ cid: string; buffer: Buffer; contentType: string; filename: string }>,
  ): Promise<{ ok: boolean; to: string; attachmentsCount: number }> {
    const resendAttachments: Array<{ filename: string; content: Buffer }> = [];

    if (attachments?.length) {
      for (const att of attachments) {
        resendAttachments.push({
          filename: att.name,
          content: Buffer.from(att.contentBytes, 'base64'),
        });
      }
    }

    if (inlineImages?.length) {
      for (const img of inlineImages) {
        resendAttachments.push({
          filename: img.filename,
          content: img.buffer,
        });
      }
    }

    try {
      const { error } = await this.resend.emails.send({
        from: this.from,
        to,
        subject,
        html: htmlBody,
        attachments: resendAttachments.length > 0 ? resendAttachments : undefined,
      });

      if (error) {
        throw new Error(error.message);
      }

      return { ok: true, to, attachmentsCount: resendAttachments.length };
    } catch (err) {
      this.logger.error(`Error al enviar email a ${to}: ${err.message}`, err.stack);
      throw err;
    }
  }
}
