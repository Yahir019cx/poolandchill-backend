import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sql from 'mssql';
import Stripe from 'stripe';
import { DatabaseService } from '../../config/database.config';
import { GetCalendarDto } from './dto/get-calendar.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CheckAvailabilityDto } from './dto/check-availability.dto';
import { BookingEmailService } from './booking-email.service';

const SP_CHECK_AVAILABILITY = '[booking].[xsp_CheckAvailability]';
const SP_CREATE_BOOKING    = '[booking].[xsp_CreateBooking]';
const SP_CONFIRM_PAYMENT   = '[booking].[xsp_ConfirmPayment]';
const SP_RECORD_PAYMENT    = '[payment].[xsp_RecordPayment]';

export interface StripePaymentData {
  paymentIntentId: string;
  chargeId: string | null;
  amount: number;
  currency: string;
  paymentStatus: string;
  paymentMethod: string | null;
  clientSecret: string | null;
}

interface CacheEntry {
  data: any;
  expiry: number;
}

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000;
  private stripe: Stripe | null = null;

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
    private readonly bookingEmailService: BookingEmailService,
  ) {}

  // ─────────────────────────────────────────────
  // VERIFICAR DISPONIBILIDAD
  // ─────────────────────────────────────────────

  async checkAvailability(dto: CheckAvailabilityDto) {
    try {
      const result = await this.databaseService.executeStoredProcedure<any>(
        SP_CHECK_AVAILABILITY,
        [
          { name: 'ID_Property', type: sql.UniqueIdentifier, value: dto.propertyId },
          { name: 'CheckInDate', type: sql.Date, value: dto.checkInDate },
          { name: 'CheckOutDate', type: sql.Date, value: dto.checkOutDate ?? null },
        ],
        [],
      );

      const row = result.recordset?.[0];
      if (!row) {
        throw new InternalServerErrorException('Respuesta inesperada del servidor');
      }

      return {
        success: true,
        data: {
          isAvailable: !!row.IsAvailable,
          conflictingBookings: row.ConflictingBookings,
          blockedDates: row.BlockedDates,
          message: row.Message,
        },
      };
    } catch (error) {
      if (error instanceof InternalServerErrorException) throw error;
      this.logger.error(`Error en ${SP_CHECK_AVAILABILITY}: ${error.message}`);
      throw new InternalServerErrorException('Error al verificar disponibilidad');
    }
  }

  // ─────────────────────────────────────────────
  // CREAR RESERVA
  // ─────────────────────────────────────────────

  async createBooking(dto: CreateBookingDto, guestId: string) {
    const inputs: { name: string; type: any; value: any }[] = [
      { name: 'ID_Property', type: sql.UniqueIdentifier, value: dto.propertyId },
      { name: 'ID_Guest', type: sql.UniqueIdentifier, value: guestId },
      { name: 'BookingDate', type: sql.Date, value: dto.bookingDate ?? null },
      { name: 'CheckInDate', type: sql.Date, value: dto.checkInDate ?? null },
      { name: 'CheckOutDate', type: sql.Date, value: dto.checkOutDate ?? null },
      { name: 'GuestNotes', type: sql.NVarChar(500), value: dto.guestNotes ?? null },
      { name: 'RequiresInvoice', type: sql.Bit, value: dto.requiresInvoice ?? false },
    ];

    let spRow: any;
    try {
      const result = await this.databaseService.executeStoredProcedure<any>(
        SP_CREATE_BOOKING,
        inputs,
        [],
      );
      spRow = result.recordset?.[0];
    } catch (error) {
      this.logger.error(`Error ejecutando ${SP_CREATE_BOOKING}: ${error.message}`);
      throw new InternalServerErrorException('Error al procesar la reserva');
    }

    if (!spRow) {
      throw new InternalServerErrorException('Respuesta inesperada del servidor');
    }

    if (spRow.Success !== 1) {
      throw new BadRequestException(spRow.Message ?? 'No se pudo crear la reserva');
    }

    const totalGuestPayment: number = Number(spRow.TotalGuestPayment);
    const amountInCents = Math.round(totalGuestPayment * 100);

    let paymentIntentId: string;
    let clientSecret: string;

    try {
      const stripe = this.getStripe();
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: 'mxn',
        automatic_payment_methods: { enabled: true },
        metadata: {
          bookingId: spRow.ID_Booking,
          bookingCode: spRow.BookingCode,
        },
        description: `Reserva ${spRow.BookingCode}`,
      });
      paymentIntentId = paymentIntent.id;
      clientSecret = paymentIntent.client_secret!;
    } catch (error) {
      this.logger.error(`Error creando PaymentIntent de Stripe: ${error.message}`);
      throw new InternalServerErrorException('Error al inicializar el pago. Intenta de nuevo.');
    }

    let breakdown: any[] = [];
    if (spRow.PriceBreakdown) {
      try {
        breakdown = JSON.parse(spRow.PriceBreakdown);
      } catch {
        breakdown = [];
      }
    }

    return {
      success: true,
      data: {
        booking: {
          bookingId: spRow.ID_Booking,
          bookingCode: spRow.BookingCode,
        },
        pricing: {
          basePrice: Number(spRow.BasePrice),
          guestServiceFee: Number(spRow.GuestServiceFee),
          totalIVA: Number(spRow.TotalIVA),
          totalGuestPayment,
          breakdown,
        },
        payment: {
          clientSecret,
          paymentIntentId,
        },
      },
    };
  }

  // ─────────────────────────────────────────────
  // CONFIRMAR PAGO (llamado desde webhook Stripe)
  // ─────────────────────────────────────────────

  async confirmPaymentFromStripe(
    bookingId: string,
    payment: StripePaymentData,
  ): Promise<void> {
    // 1. Registrar el pago en StripePayments
    try {
      const recordResult = await this.databaseService.executeStoredProcedure<any>(
        SP_RECORD_PAYMENT,
        [
          { name: 'ID_Booking', type: sql.UniqueIdentifier, value: bookingId },
          { name: 'PaymentIntentId', type: sql.VarChar(100), value: payment.paymentIntentId },
          { name: 'ChargeId', type: sql.VarChar(100), value: payment.chargeId },
          { name: 'Amount', type: sql.Decimal(10, 2), value: payment.amount },
          { name: 'Currency', type: sql.VarChar(10), value: payment.currency },
          { name: 'PaymentStatus', type: sql.VarChar(50), value: payment.paymentStatus },
          { name: 'PaymentMethod', type: sql.VarChar(50), value: payment.paymentMethod },
          { name: 'ClientSecret', type: sql.VarChar(200), value: payment.clientSecret },
        ],
        [],
      );
      const recordRow = recordResult.recordset?.[0];
      if (!recordRow || recordRow.Success !== 1) {
        this.logger.warn(
          `${SP_RECORD_PAYMENT} falló para booking ${bookingId}: ${recordRow?.Message}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error ejecutando ${SP_RECORD_PAYMENT} para booking ${bookingId}: ${error.message}`,
      );
    }

    // 2. Confirmar la reserva, generar QR y obtener datos para email
    let spRow: any;
    try {
      const result = await this.databaseService.executeStoredProcedure<any>(
        SP_CONFIRM_PAYMENT,
        [
          { name: 'ID_Booking', type: sql.UniqueIdentifier, value: bookingId },
          { name: 'StripePaymentIntentId', type: sql.VarChar(100), value: payment.paymentIntentId },
        ],
        [],
      );
      spRow = result.recordset?.[0];
    } catch (error) {
      this.logger.error(
        `Error ejecutando ${SP_CONFIRM_PAYMENT} para booking ${bookingId}: ${error.message}`,
      );
      throw error;
    }

    if (!spRow || spRow.Success !== 1) {
      this.logger.warn(
        `${SP_CONFIRM_PAYMENT} rechazó booking ${bookingId}: ${spRow?.Message}`,
      );
      return;
    }

    if (spRow.Message === 'Reserva ya estaba confirmada') {
      this.logger.log(`Booking ${bookingId} ya estaba confirmado — email omitido`);
      return;
    }

    // 3. Enviar email con los datos que devolvió el SP
    try {
      await this.bookingEmailService.sendBookingConfirmedEmail({
        guestEmail: spRow.GuestEmail,
        guestName: spRow.GuestName,
        bookingCode: spRow.BookingCode,
        qrCodeData: spRow.QRCodeData,
        bookingType: spRow.BookingType as 'hourly' | 'daily',
        bookingDate: spRow.BookingDate ?? null,
        checkInDate: spRow.CheckInDate ?? null,
        checkOutDate: spRow.CheckOutDate ?? null,
        numberOfNights: spRow.NumberOfNights ?? null,
        basePrice: Number(spRow.BasePrice),
        guestServiceFee: Number(spRow.GuestServiceFee),
        totalIVA: Number(spRow.TotalIVA),
        totalGuestPayment: Number(spRow.TotalGuestPayment),
      });
    } catch (emailErr) {
      this.logger.error(
        `Email de confirmación falló para booking ${bookingId}: ${emailErr.message}`,
      );
    }
  }

  // ─────────────────────────────────────────────
  // CALENDARIO DE DISPONIBILIDAD
  // ─────────────────────────────────────────────

  async getAvailabilityCalendar(dto: GetCalendarDto) {
    const cacheKey = `calendar:${dto.propertyId}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const result = await this.databaseService.executeStoredProcedure(
        '[pricing].[xsp_GetAvailabilityCalendar]',
        [{ name: 'ID_Property', type: sql.UniqueIdentifier, value: dto.propertyId }],
        [],
      );

      const recordset = result.recordset || [];

      const firstRow = recordset[0];
      if (firstRow?.ErrorMessage) {
        throw new NotFoundException(firstRow.ErrorMessage);
      }

      const calendar = recordset.map((row: any) => ({
        date: this.formatDate(row.Date),
        availabilityStatus: this.toCamelCaseValue(row.AvailabilityStatus),
        blockReason: row.BlockReason ?? null,
        price: row.Price != null ? Number(row.Price) : null,
        priceSource: this.toCamelCaseValue(row.PriceSource),
        idSpecialRate: row.ID_SpecialRate ?? null,
        specialRateReason: row.SpecialRateReason ?? null,
        dayName: row.DayName ?? null,
        dayOfWeek: row.DayOfWeek != null ? Number(row.DayOfWeek) : null,
      }));

      const response = {
        success: true,
        data: {
          propertyId: dto.propertyId,
          calendar,
        },
      };

      this.setCache(cacheKey, response);
      return response;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Error en SP xsp_GetAvailabilityCalendar: ${error.message}`);
      throw new InternalServerErrorException('Error al obtener el calendario de disponibilidad');
    }
  }

  // ─────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────

  private getStripe(): Stripe {
    if (!this.stripe) {
      const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
      if (!secretKey) {
        throw new InternalServerErrorException('STRIPE_SECRET_KEY no configurada');
      }
      this.stripe = new Stripe(secretKey, { apiVersion: '2026-01-28.clover' });
    }
    return this.stripe;
  }

  private formatDate(d: Date | string): string {
    const date = typeof d === 'string' ? new Date(d) : d;
    return date.toISOString().split('T')[0];
  }

  private toCamelCaseValue(val: string | null | undefined): string | null {
    if (val == null) return null;
    return val
      .split('_')
      .map((part, i) =>
        i === 0
          ? part.toLowerCase()
          : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase(),
      )
      .join('');
  }

  private getFromCache(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry || Date.now() > entry.expiry) {
      if (entry) this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + this.CACHE_TTL_MS,
    });
  }

  invalidateCalendarCache(propertyId: string): void {
    const cacheKey = `calendar:${propertyId}`;
    if (this.cache.delete(cacheKey)) {
      this.logger.debug(`Calendar cache invalidated for property ${propertyId}`);
    }
  }
}
