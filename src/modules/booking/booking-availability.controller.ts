import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { BookingService } from './booking.service';
import { CheckAvailabilityDto } from './dto/check-availability.dto';
import { GetCalendarDto } from './dto/get-calendar.dto';

@ApiTags('Booking - Disponibilidad')
@Controller('booking')
export class BookingAvailabilityController {
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
                  availabilityStatus: {
                    type: 'string',
                    enum: ['available', 'booked', 'ownerBlocked'],
                  },
                  blockReason: { type: 'string', nullable: true },
                  price: { type: 'number', example: 3000.0 },
                  priceSource: {
                    type: 'string',
                    enum: ['specialRate', 'baseWeekend', 'baseWeekday'],
                  },
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

