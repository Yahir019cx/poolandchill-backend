import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { BookingService } from './booking.service';
import { GetCalendarDto } from './dto/get-calendar.dto';

@ApiTags('Booking')
@Controller('booking')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

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
