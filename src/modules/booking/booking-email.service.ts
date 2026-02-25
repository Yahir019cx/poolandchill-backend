import { Injectable, Logger } from '@nestjs/common';
import * as QRCode from 'qrcode';
import { ZohoMailService } from '../../web/email/zoho-mail.service';
import {
  bookingConfirmedTemplate,
  BookingConfirmedTemplateParams,
} from '../../web/email/templates/booking-confirmed.template';

const QR_CID = 'booking-qr-code';

export interface SendBookingConfirmedEmailParams {
  guestEmail: string;
  guestName: string;
  bookingCode: string;
  qrCodeData: string;
  bookingType: 'hourly' | 'daily';
  bookingDate?: string | null;
  checkInDate?: string | null;
  checkOutDate?: string | null;
  numberOfNights?: number | null;
  basePrice: number;
  guestServiceFee: number;
  totalIVA: number;
  totalGuestPayment: number;
}

@Injectable()
export class BookingEmailService {
  private readonly logger = new Logger(BookingEmailService.name);

  constructor(private readonly mailer: ZohoMailService) {}

  async sendBookingConfirmedEmail(params: SendBookingConfirmedEmailParams): Promise<void> {
    this.logger.log(`[EMAIL] sendBookingConfirmedEmail iniciado — to: ${params.guestEmail}, bookingCode: ${params.bookingCode}`);

    let qrBuffer: Buffer;
    try {
      qrBuffer = await QRCode.toBuffer(params.qrCodeData, {
        type: 'png',
        width: 400,
        margin: 2,
        color: { dark: '#063940', light: '#FFFFFF' },
      });
      this.logger.log(`[EMAIL] QR generado OK (${qrBuffer.length} bytes) para ${params.bookingCode}`);
    } catch (err) {
      this.logger.error(`[EMAIL] Error generando QR para ${params.bookingCode}: ${err.message}`);
      throw err;
    }

    const templateParams: BookingConfirmedTemplateParams = {
      guestName: params.guestName,
      bookingCode: params.bookingCode,
      bookingType: params.bookingType,
      bookingDate: params.bookingDate ?? undefined,
      checkInDate: params.checkInDate ?? undefined,
      checkOutDate: params.checkOutDate ?? undefined,
      numberOfNights: params.numberOfNights ?? undefined,
      basePrice: params.basePrice,
      guestServiceFee: params.guestServiceFee,
      totalIVA: params.totalIVA,
      totalGuestPayment: params.totalGuestPayment,
      qrCodeCid: QR_CID,
    };

    const html = bookingConfirmedTemplate(templateParams);

    try {
      this.logger.log(`[EMAIL] Enviando correo a ${params.guestEmail} (Zoho)...`);
      await this.mailer.sendMail(
        params.guestEmail,
        `✅ Reserva confirmada — ${params.bookingCode}`,
        html,
        undefined,
        [
          {
            cid: QR_CID,
            buffer: qrBuffer,
            contentType: 'image/png',
            filename: 'qr-acceso.png',
          },
        ],
      );
      this.logger.log(`[EMAIL] Correo enviado OK a ${params.guestEmail} [${params.bookingCode}]`);
    } catch (err) {
      this.logger.error(
        `[EMAIL] Error enviando a ${params.guestEmail}: ${err.message}`,
      );
      throw err;
    }
  }
}
