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
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { CalculateRefundDto } from './dto/calculate-refund.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { BookingEmailService } from './booking-email.service';

const SP_CHECK_AVAILABILITY  = '[booking].[xsp_CheckAvailability]';
const SP_CREATE_BOOKING      = '[booking].[xsp_CreateBooking]';
const SP_CONFIRM_PAYMENT     = '[booking].[xsp_ConfirmPayment]';
const SP_RECORD_PAYMENT      = '[payment].[xsp_RecordPayment]';
const SP_CHECK_IN            = '[booking].[xsp_CheckIn]';
const SP_CHECK_OUT           = '[booking].[xsp_CheckOut]';
const SP_CALCULATE_REFUND    = '[booking].[xsp_CalculateRefund]';
const SP_CANCEL_BOOKING      = '[booking].[xsp_CancelBooking]';
const SP_GET_HOST_BOOKINGS   = '[booking].[xsp_GetHostBookings]';
const SP_GET_GUEST_BOOKINGS  = '[booking].[xsp_GetGuestBookings]';

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
    this.logger.log(`[CONFIRM] Iniciando para booking ${bookingId} — PI: ${payment.paymentIntentId}`);

    // 1. Registrar el pago en StripePayments
    try {
      this.logger.log(`[CONFIRM] Paso 1: Ejecutando ${SP_RECORD_PAYMENT}...`);
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
      this.logger.log(`[CONFIRM] Paso 1 resultado: ${JSON.stringify(recordRow)}`);
      if (!recordRow || recordRow.Success !== 1) {
        this.logger.warn(
          `${SP_RECORD_PAYMENT} falló para booking ${bookingId}: ${recordRow?.Message}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `[CONFIRM] ERROR en Paso 1 (${SP_RECORD_PAYMENT}) para booking ${bookingId}: ${error.message}`,
      );
    }

    // 2. Confirmar la reserva, generar QR y obtener datos para email
    let spRow: any;
    try {
      this.logger.log(
        `[CONFIRM] Paso 2: Ejecutando ${SP_CONFIRM_PAYMENT} con ID_Booking=${bookingId}, StripePaymentIntentId=${payment.paymentIntentId}`,
      );
      const result = await this.databaseService.executeStoredProcedure<any>(
        SP_CONFIRM_PAYMENT,
        [
          { name: 'ID_Booking', type: sql.UniqueIdentifier, value: bookingId },
          { name: 'StripePaymentIntentId', type: sql.VarChar(100), value: payment.paymentIntentId },
        ],
        [],
      );
      spRow = result.recordset?.[0];
      this.logger.log(`[CONFIRM] Paso 2 resultado: Success=${spRow?.Success}, Message=${spRow?.Message}, full: ${JSON.stringify(spRow)}`);
    } catch (error) {
      this.logger.error(
        `[CONFIRM] ERROR en Paso 2 (${SP_CONFIRM_PAYMENT}) para booking ${bookingId}: ${error.message}`,
      );
      throw error;
    }

    if (!spRow || spRow.Success !== 1) {
      this.logger.warn(
        `[CONFIRM] RECHAZADO POR SP — bookingId: ${bookingId}, Success: ${spRow?.Success}, Message: ${spRow?.Message ?? 'sin mensaje'}, spRow: ${JSON.stringify(spRow)}`,
      );
      return;
    }

    if (spRow.Message === 'Reserva ya estaba confirmada') {
      this.logger.log(`[CONFIRM] Booking ${bookingId} ya estaba confirmado — email omitido`);
      return;
    }

    // 3. Enviar email con los datos que devolvió el SP
    this.logger.log(`[CONFIRM] Paso 3: Enviando email a ${spRow.GuestEmail}...`);
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
        checkInTime: spRow.CheckInTime ?? null,
        checkOutTime: spRow.CheckOutTime ?? null,
        numberOfNights: spRow.NumberOfNights ?? null,
        propertyName: spRow.PropertyName ?? null,
        hasPool: spRow.HasPool === 1 || spRow.HasPool === true,
        hasCabin: spRow.HasCabin === 1 || spRow.HasCabin === true,
        hasCamping: spRow.HasCamping === 1 || spRow.HasCamping === true,
        latitude: spRow.Latitude ? Number(spRow.Latitude) : null,
        longitude: spRow.Longitude ? Number(spRow.Longitude) : null,
        basePrice: Number(spRow.BasePrice),
        guestServiceFee: Number(spRow.GuestServiceFee),
        totalIVA: Number(spRow.TotalIVA),
        totalGuestPayment: Number(spRow.TotalGuestPayment),
      });
      this.logger.log(`[CONFIRM] Paso 3 completado — email enviado a ${spRow.GuestEmail}`);
    } catch (emailErr) {
      this.logger.error(
        `[CONFIRM] ERROR en Paso 3 (email) para booking ${bookingId}: ${emailErr.message}`,
      );
    }

    this.logger.log(`[CONFIRM] Flujo completo OK para booking ${bookingId}`);
  }

  // ─────────────────────────────────────────────
  // CHECK-IN (Host escanea QR)
  // ─────────────────────────────────────────────

  async checkIn(dto: CheckInDto, hostId: string) {
    try {
      const result = await this.databaseService.executeStoredProcedure<any>(
        SP_CHECK_IN,
        [
          { name: 'BookingCode', type: sql.VarChar(30), value: dto.bookingCode },
          { name: 'ID_Booking', type: sql.UniqueIdentifier, value: dto.bookingId },
          { name: 'QRHash', type: sql.VarChar(64), value: dto.qrHash },
          { name: 'ID_Host', type: sql.UniqueIdentifier, value: hostId },
        ],
        [],
      );

      const row = result.recordset?.[0];
      if (!row) {
        throw new InternalServerErrorException('Respuesta inesperada del servidor');
      }

      if (row.Success !== 1) {
        throw new BadRequestException(row.Message ?? 'No se pudo realizar el check-in');
      }

      return {
        success: true,
        data: {
          bookingCode: row.BookingCode,
          checkInDate: row.CheckInDate,
          checkInAt: row.CheckInAt,
          message: row.Message,
        },
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      if (error instanceof InternalServerErrorException) throw error;
      this.logger.error(`Error en ${SP_CHECK_IN}: ${error.message}`);
      throw new InternalServerErrorException('Error al procesar el check-in');
    }
  }

  // ─────────────────────────────────────────────
  // CHECK-OUT (Host cierra renta)
  // ─────────────────────────────────────────────

  async checkOut(dto: CheckOutDto, hostId: string) {
    try {
      const result = await this.databaseService.executeStoredProcedure<any>(
        SP_CHECK_OUT,
        [
          { name: 'ID_Booking', type: sql.UniqueIdentifier, value: dto.bookingId },
          { name: 'ID_Host', type: sql.UniqueIdentifier, value: hostId },
          { name: 'PropertyCondition', type: sql.VarChar(20), value: dto.propertyCondition },
          { name: 'HostNotes', type: sql.NVarChar(1000), value: dto.hostNotes ?? null },
        ],
        [],
      );

      const row = result.recordset?.[0];
      if (!row) {
        throw new InternalServerErrorException('Respuesta inesperada del servidor');
      }

      if (row.Success !== 1) {
        throw new BadRequestException(row.Message ?? 'No se pudo realizar el check-out');
      }

      return {
        success: true,
        data: {
          bookingCode: row.BookingCode,
          propertyCondition: row.PropertyCondition,
          newStatus: row.NewStatus,
          checkOutTime: row.CheckOutTime,
          message: row.Message,
        },
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      if (error instanceof InternalServerErrorException) throw error;
      this.logger.error(`Error en ${SP_CHECK_OUT}: ${error.message}`);
      throw new InternalServerErrorException('Error al procesar el check-out');
    }
  }

  // ─────────────────────────────────────────────
  // CALCULAR REEMBOLSO (solo cálculo, no modifica)
  // ─────────────────────────────────────────────

  async calculateRefund(dto: CalculateRefundDto) {
    try {
      const result = await this.databaseService.executeStoredProcedure<any>(
        SP_CALCULATE_REFUND,
        [
          { name: 'ID_Booking', type: sql.UniqueIdentifier, value: dto.bookingId },
          { name: 'CancellationReason', type: sql.VarChar(50), value: dto.cancellationReason ?? 'guest_request' },
          { name: 'IsForceMapprovement', type: sql.Bit, value: 0 },
        ],
        [],
      );

      const row = result.recordset?.[0];
      if (!row) {
        throw new InternalServerErrorException('Respuesta inesperada del servidor');
      }

      if (row.Success !== 1) {
        throw new BadRequestException(row.Message ?? 'No se pudo calcular el reembolso');
      }

      return {
        success: true,
        data: {
          bookingId: row.ID_Booking,
          totalPaid: Number(row.TotalPaid),
          refundPercentage: Number(row.RefundPercentage),
          refundAmount: Number(row.RefundAmount),
          daysUntilCheckIn: row.DaysUntilCheckIn,
          cancellationReason: row.CancellationReason,
          policyDescription: row.PolicyDescription,
        },
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      if (error instanceof InternalServerErrorException) throw error;
      this.logger.error(`Error en ${SP_CALCULATE_REFUND}: ${error.message}`);
      throw new InternalServerErrorException('Error al calcular el reembolso');
    }
  }

  // ─────────────────────────────────────────────
  // CANCELAR RESERVA + REFUND EN STRIPE
  // ─────────────────────────────────────────────

  async cancelBooking(dto: CancelBookingDto, userId: string) {
    let spRow: any;
    try {
      const result = await this.databaseService.executeStoredProcedure<any>(
        SP_CANCEL_BOOKING,
        [
          { name: 'ID_Booking', type: sql.UniqueIdentifier, value: dto.bookingId },
          { name: 'ID_User', type: sql.UniqueIdentifier, value: userId },
          { name: 'CancellationReason', type: sql.VarChar(50), value: dto.cancellationReason ?? 'guest_request' },
          { name: 'IsForceMajeurApproved', type: sql.Bit, value: dto.isForceMajeurApproved ?? false },
          { name: 'IsAdmin', type: sql.Bit, value: dto.isAdmin ?? false },
        ],
        [],
      );

      spRow = result.recordset?.[0];
    } catch (error) {
      this.logger.error(`Error ejecutando ${SP_CANCEL_BOOKING}: ${error.message}`);
      throw new InternalServerErrorException('Error al cancelar la reserva');
    }

    if (!spRow) {
      throw new InternalServerErrorException('Respuesta inesperada del servidor');
    }

    if (spRow.Success !== 1) {
      throw new BadRequestException(spRow.Message ?? 'No se pudo cancelar la reserva');
    }

    // Si hay monto a reembolsar y tenemos PaymentIntentId, hacer refund en Stripe
    const refundAmount = Number(spRow.RefundAmount);
    let stripeRefundId: string | null = null;

    if (refundAmount > 0 && spRow.PaymentIntentId) {
      try {
        const stripe = this.getStripe();
        const refund = await stripe.refunds.create({
          payment_intent: spRow.PaymentIntentId,
          amount: Math.round(refundAmount * 100),
          reason: 'requested_by_customer',
        });
        stripeRefundId = refund.id;
        this.logger.log(
          `Refund ${refund.id} creado por $${refundAmount} para booking ${dto.bookingId}`,
        );
      } catch (stripeErr: any) {
        this.logger.error(
          `Error creando refund en Stripe para booking ${dto.bookingId}: ${stripeErr.message}`,
        );
      }
    }

    return {
      success: true,
      data: {
        bookingCode: spRow.BookingCode,
        refundId: spRow.ID_Refund,
        refundAmount,
        refundPercentage: Number(spRow.RefundPercentage),
        stripeRefundId,
        policyDescription: spRow.PolicyDescription,
        message: spRow.Message,
      },
    };
  }

  // ─────────────────────────────────────────────
  // LISTAR RESERVAS DEL HOST AUTENTICADO
  // ─────────────────────────────────────────────

  async getHostBookings(hostId: string) {
    const pool = await this.databaseService.getConnection();
    const request = pool.request();

    request.input('ID_Owner', sql.UniqueIdentifier, hostId);

    const result = await request.execute(SP_GET_HOST_BOOKINGS);
    const recordsets = result.recordsets as any[];

    const firstRow = recordsets[0]?.[0];

    // Caso: el SP devuelve solo ErrorMessage (sin reservas)
    if (firstRow?.ErrorMessage) {
      return {
        success: true,
        data: {
          summary: {
            totalBookings: 0,
            totalProximas: 0,
            totalPasadas: 0,
            totalCanceladas: 0,
            totalNoShow: 0,
          },
          bookings: [],
          message: firstRow.ErrorMessage,
        },
      };
    }

    const summaryRow = firstRow;
    const bookingRows = recordsets[1] || [];

    return {
      success: true,
      data: {
        summary: {
          totalBookings: Number(summaryRow.TotalBookings) || 0,
          totalProximas: Number(summaryRow.TotalProximas) || 0,
          totalPasadas: Number(summaryRow.TotalPasadas) || 0,
          totalCanceladas: Number(summaryRow.TotalCanceladas) || 0,
          totalNoShow: Number(summaryRow.TotalNoShow) || 0,
        },
        bookings: bookingRows.map((b: any) => ({
          bookingId: b.ID_Booking,
          bookingCode: b.BookingCode,
          bookingType: b.BookingType,
          bookingDate: b.BookingDate,
          bookingStartTime: b.BookingStartTime,
          bookingEndTime: b.BookingEndTime,
          checkInDate: b.CheckInDate,
          checkOutDate: b.CheckOutDate,
          numberOfNights: b.NumberOfNights,
          propertyId: b.ID_Property,
          propertyName: b.PropertyName,
          propertyRating: {
            average: b.AvgPropertyRating,
            totalReviews: b.TotalPropertyReviews,
          },
          guest: {
            guestId: b.ID_Guest,
            displayName: b.GuestDisplayName,
            profileImageUrl: b.GuestProfileImageUrl,
            rating: {
              average: b.AvgGuestRating,
              totalReviews: b.TotalGuestReviews,
            },
          },
          totalGuestPayment: Number(b.TotalGuestPayment),
          status: {
            id: b.ID_Status,
            name: b.StatusName,
          },
          payout: {
            hostPayout: b.HostPayout,
            payoutStatus: b.PayoutStatus,
          },
          hostRating: {
            average: b.AvgHostRating,
            totalReviews: b.TotalHostReviews,
          },
        })),
      },
    };
  }

  // ─────────────────────────────────────────────
  // LISTAR RESERVAS DEL GUEST AUTENTICADO
  // ─────────────────────────────────────────────

  async getGuestBookings(guestId: string) {
    const pool = await this.databaseService.getConnection();
    const request = pool.request();

    request.input('ID_Guest', sql.UniqueIdentifier, guestId);

    const result = await request.execute(SP_GET_GUEST_BOOKINGS);
    const recordsets = result.recordsets as any[];

    const firstRow = recordsets[0]?.[0];

    // Caso: el SP devuelve solo ErrorMessage (sin reservas)
    if (firstRow?.ErrorMessage) {
      return {
        success: true,
        data: {
          summary: {
            totalBookings: 0,
            totalProximas: 0,
            totalPasadas: 0,
            totalCanceladas: 0,
            totalNoShow: 0,
          },
          bookings: [],
          message: firstRow.ErrorMessage,
        },
      };
    }

    const summaryRow = firstRow;
    const bookingRows = recordsets[1] || [];

    return {
      success: true,
      data: {
        summary: {
          totalBookings: Number(summaryRow.TotalBookings) || 0,
          totalProximas: Number(summaryRow.TotalProximas) || 0,
          totalPasadas: Number(summaryRow.TotalPasadas) || 0,
          totalCanceladas: Number(summaryRow.TotalCanceladas) || 0,
          totalNoShow: Number(summaryRow.TotalNoShow) || 0,
        },
        bookings: bookingRows.map((b: any) => ({
          bookingId: b.ID_Booking,
          bookingCode: b.BookingCode,
          bookingType: b.BookingType,
          bookingDate: b.BookingDate,
          bookingStartTime: b.BookingStartTime,
          bookingEndTime: b.BookingEndTime,
          checkInDate: b.CheckInDate,
          checkOutDate: b.CheckOutDate,
          numberOfNights: b.NumberOfNights,
          qrCodeData: b.QRCodeData,
          propertyId: b.ID_Property,
          propertyName: b.PropertyName,
          propertyImageUrl: b.PropertyImageUrl,
          propertyRating: {
            average: b.PropertyAvgRating,
            totalReviews: b.PropertyTotalReviews,
          },
          // Rating promedio general del guest (mismo valor en todas las filas)
          guestRating: {
            average: b.GuestAvgRating,
            totalReviews: b.GuestTotalReviews,
          },
          host: {
            hostId: b.ID_Owner,
            displayName: b.HostDisplayName,
            profileImageUrl: b.HostProfileImageUrl,
            isIdentityVerified: Boolean(b.IsIdentityVerified),
          },
          totalGuestPayment: Number(b.TotalGuestPayment),
          status: {
            id: b.ID_Status,
            name: b.StatusName,
          },
        })),
      },
    };
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
