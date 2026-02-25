import {
  Controller,
  Post,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BookingService } from './booking.service';
import { GetCalendarDto } from './dto/get-calendar.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CheckAvailabilityDto } from './dto/check-availability.dto';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { CalculateRefundDto } from './dto/calculate-refund.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';

@ApiTags('Booking')
@Controller('booking')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post('check-availability')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({
    summary: 'Verificar disponibilidad',
    description: `
      Verifica si las fechas están disponibles para una propiedad.
      Revisa reservas existentes y bloqueos del propietario.
      Endpoint público, no requiere autenticación.
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Resultado de disponibilidad',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            isAvailable: { type: 'boolean', example: true },
            conflictingBookings: { type: 'number', example: 0 },
            blockedDates: { type: 'number', example: 0 },
            message: { type: 'string', example: 'Disponible' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 500, description: 'Error en el servidor' })
  async checkAvailability(@Body() dto: CheckAvailabilityDto) {
    return this.bookingService.checkAvailability(dto);
  }

  @Post('create')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({
    summary: 'Crear reserva',
    description: `
      Crea una nueva reserva para una propiedad.
      Los datos del huésped (nombre, email, teléfono) se obtienen
      automáticamente del perfil del usuario autenticado.

      **Tipos de propiedad:**
      - **Solo alberca:** envía \`bookingDate\` (1 día).
      - **Cabaña / Camping:** envía \`checkInDate\` y \`checkOutDate\`.

      Retorna un \`clientSecret\` de Stripe para completar el pago
      desde el cliente con el SDK de Stripe.

      **Requiere autenticación JWT.**
    `,
  })
  @ApiResponse({
    status: 201,
    description: 'Reserva creada. Usa el clientSecret para completar el pago.',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            booking: {
              type: 'object',
              properties: {
                bookingId: { type: 'string', format: 'uuid' },
                bookingCode: { type: 'string', example: 'PLH-2026-000001' },
              },
            },
            pricing: {
              type: 'object',
              properties: {
                basePrice: { type: 'number', example: 3000.0 },
                guestServiceFee: { type: 'number', example: 150.0 },
                totalIVA: { type: 'number', example: 504.0 },
                totalGuestPayment: { type: 'number', example: 3654.0 },
                breakdown: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      date: { type: 'string', example: '2026-03-15' },
                      price: { type: 'number', example: 1500.0 },
                      source: { type: 'string', enum: ['special', 'base_weekend', 'base_weekday'] },
                    },
                  },
                },
              },
            },
            payment: {
              type: 'object',
              properties: {
                clientSecret: { type: 'string', example: 'pi_3xxx_secret_yyy' },
                paymentIntentId: { type: 'string', example: 'pi_3xxx' },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos, fechas no disponibles o propiedad inactiva' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 500, description: 'Error en el servidor' })
  async createBooking(@Body() dto: CreateBookingDto, @Req() req: any) {
    const guestId: string = req.user?.userId;
    return this.bookingService.createBooking(dto, guestId);
  }

  @Post('check-in')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Check-in (Host escanea QR)',
    description: `
      El host escanea el código QR del huésped para registrar la llegada.
      Valida: QR hash, que sea el host correcto, estado confirmed,
      y que sea la fecha de check-in (tolerancia hasta 6 AM del día siguiente).

      **Requiere autenticación JWT del host.**
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Check-in exitoso',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            bookingCode: { type: 'string', example: 'PLH-2026-000005' },
            checkInDate: { type: 'string', example: '2026-03-15' },
            checkInAt: { type: 'string', format: 'date-time' },
            message: { type: 'string', example: 'Check-in exitoso' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'QR inválido, fecha incorrecta, estado no válido o no es el host' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async checkIn(@Body() dto: CheckInDto, @Req() req: any) {
    const hostId: string = req.user?.userId;
    return this.bookingService.checkIn(dto, hostId);
  }

  @Post('check-out')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Check-out (Host cierra renta)',
    description: `
      El host registra la salida del huésped e indica el estado de la propiedad.

      - **good**: Propiedad en buen estado → status \`completed\`, payout programado 48h después.
      - **damaged**: Propiedad dañada → status \`disputed\`, payout en espera.

      Solo se puede hacer check-out desde estado \`checked_in\` y en la fecha de check-out o posterior.

      **Requiere autenticación JWT del host.**
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Check-out exitoso',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            bookingCode: { type: 'string', example: 'PLH-2026-000005' },
            propertyCondition: { type: 'string', enum: ['good', 'damaged'] },
            newStatus: { type: 'number', example: 4 },
            checkOutTime: { type: 'string', format: 'date-time' },
            message: { type: 'string', example: 'Check-out exitoso. Payout programado para 2026-03-19 12:30' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Estado no válido, fecha incorrecta o no es el host' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async checkOut(@Body() dto: CheckOutDto, @Req() req: any) {
    const hostId: string = req.user?.userId;
    return this.bookingService.checkOut(dto, hostId);
  }

  @Post('calculate-refund')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Calcular reembolso (preview)',
    description: `
      Calcula cuánto se reembolsaría al huésped si cancela la reserva.
      **No modifica nada**, solo devuelve el cálculo.

      Política:
      - **7+ días antes**: 100% reembolso
      - **2-7 días antes**: 75%
      - **Menos de 48h**: 50%
      - **No show**: 0%
      - **Fuerza mayor**: 100% (requiere admin)

      **Requiere autenticación JWT.**
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Cálculo de reembolso',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            bookingId: { type: 'string', format: 'uuid' },
            totalPaid: { type: 'number', example: 8526.0 },
            refundPercentage: { type: 'number', example: 100.0 },
            refundAmount: { type: 'number', example: 8526.0 },
            daysUntilCheckIn: { type: 'number', example: 15 },
            cancellationReason: { type: 'string', example: 'guest_request' },
            policyDescription: { type: 'string', example: 'Cancelación con 7+ días de anticipación - Reembolso total' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Booking no encontrado o estado no cancelable' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async calculateRefund(@Body() dto: CalculateRefundDto) {
    return this.bookingService.calculateRefund(dto);
  }

  @Post('cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({
    summary: 'Cancelar reserva',
    description: `
      Cancela una reserva, calcula el reembolso según la política,
      libera las fechas bloqueadas y procesa el refund en Stripe.

      Solo el guest puede cancelar su propia reserva (o un admin).
      Solo se puede cancelar desde estado \`confirmed\` o \`checked_in\`.

      **Requiere autenticación JWT.**
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Reserva cancelada',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            bookingCode: { type: 'string', example: 'PLH-2026-000005' },
            refundId: { type: 'string', format: 'uuid' },
            refundAmount: { type: 'number', example: 8526.0 },
            refundPercentage: { type: 'number', example: 100.0 },
            stripeRefundId: { type: 'string', nullable: true, example: 're_1234567890' },
            policyDescription: { type: 'string' },
            message: { type: 'string', example: 'Reserva cancelada exitosamente. Reembolso en proceso.' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'No se puede cancelar, sin permisos o estado inválido' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async cancelBooking(@Body() dto: CancelBookingDto, @Req() req: any) {
    const userId: string = req.user?.userId;
    return this.bookingService.cancelBooking(dto, userId);
  }

  @Post('calendar')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({
    summary: 'Calendario de disponibilidad',
    description: `
      Obtiene el calendario de disponibilidad y precios de una propiedad.
      El SP calcula internamente: mañana + 90 días.
      Endpoint público, no requiere autenticación.
      Cache: 5 minutos.
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Calendario de disponibilidad',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            propertyId: { type: 'string', format: 'uuid' },
            calendar: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  date: { type: 'string', example: '2026-02-16' },
                  availabilityStatus: { type: 'string', enum: ['available', 'booked', 'ownerBlocked'] },
                  blockReason: { type: 'string', nullable: true },
                  price: { type: 'number', example: 3000.0 },
                  priceSource: { type: 'string', enum: ['specialRate', 'baseWeekend', 'baseWeekday'] },
                  specialRateReason: { type: 'string', nullable: true },
                  dayName: { type: 'string', example: 'Sunday' },
                  dayOfWeek: { type: 'number', example: 1 },
                },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Validación fallida (propertyId inválido)' })
  @ApiResponse({ status: 404, description: 'Propiedad no encontrada' })
  @ApiResponse({ status: 500, description: 'Error en el servidor' })
  async getCalendar(@Body() dto: GetCalendarDto) {
    return this.bookingService.getAvailabilityCalendar(dto);
  }
}
