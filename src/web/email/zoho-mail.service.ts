import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

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
      secure: false, // STARTTLS
      auth: {
        user,
        pass,
      },
    });

    this.logger.log(`Zoho Mail transporter configurado en ${host}:${port}`);
  }

  async sendMail(
    to: string,
    subject: string,
    htmlBody: string,
    attachments?: Array<{ name: string; contentBytes: string; contentType: string }>
  ): Promise<{ ok: boolean; to: string; attachmentsCount: number }> {
    const from = process.env.MAIL_FROM || process.env.ZOHO_SMTP_USER;
    const fromName = process.env.MAIL_FROM_NAME || 'Pool & Chill';

    const mailOptions: nodemailer.SendMailOptions = {
      from: `"${fromName}" <${from}>`,
      to,
      subject,
      html: htmlBody,
    };

    // Convertir adjuntos de base64 a formato nodemailer
    if (attachments && attachments.length > 0) {
      mailOptions.attachments = attachments.map(att => ({
        filename: att.name,
        content: Buffer.from(att.contentBytes, 'base64'),
        contentType: att.contentType,
      }));
    }

    try {
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email enviado exitosamente a ${to}. MessageId: ${info.messageId}`);
      return { ok: true, to, attachmentsCount: attachments?.length || 0 };
    } catch (error) {
      this.logger.error(`Error al enviar email a ${to}: ${error.message}`, error.stack);
      throw error;
    }
  }
}
