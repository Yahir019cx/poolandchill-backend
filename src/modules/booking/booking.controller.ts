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
