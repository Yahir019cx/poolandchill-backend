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
import { CreateBookingDto } from './dto/create-booking.dto';
import { ListBookingsDto } from './dto/list-bookings.dto';

@ApiTags('Booking - Reservas & listado')
@Controller('booking')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

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
                      source: {
                        type: 'string',
                        enum: ['special', 'base_weekend', 'base_weekday'],
                      },
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
  @ApiResponse({
    status: 400,
    description:
      'Datos inválidos, fechas no disponibles o propiedad inactiva',
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 500, description: 'Error en el servidor' })
  async createBooking(@Body() dto: CreateBookingDto, @Req() req: any) {
    const guestId: string = req.user?.userId;
    return this.bookingService.createBooking(dto, guestId);
  }

  @Post('host/bookings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({
    summary: 'Listar reservas del host autenticado (paginado)',
    description: `
      Devuelve el resumen y una página de reservas del host autenticado.
      El ID_Owner se toma del JWT (userId).

      **Load more / scroll infinito:** envía \`page\` y \`pageSize\` en el body.
      Primera carga: \`{ "page": 1, "pageSize": 20 }\`. Al cargar más: \`{ "page": 2, "pageSize": 20 }\`.
      El front concatena \`data.bookings\` y usa \`data.pagination.hasMore\` para saber si hay más.
    `,
  })
  @ApiResponse({ status: 200, description: 'Listado de reservas del host con pagination' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async getHostBookings(@Req() req: any, @Body() dto?: ListBookingsDto) {
    const hostId: string = req.user?.userId;
    return this.bookingService.getHostBookings(hostId, dto);
  }

  @Post('guest/bookings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({
    summary: 'Listar reservas del guest autenticado (paginado)',
    description: `
      Devuelve el resumen y una página de reservas del huésped autenticado.
      El ID_Guest se toma del JWT (userId).

      **Load more / scroll infinito:** envía \`page\` y \`pageSize\` en el body.
      Primera carga: \`{ "page": 1, "pageSize": 20 }\`. Al cargar más: \`{ "page": 2, "pageSize": 20 }\`.
      El front concatena \`data.bookings\` y usa \`data.pagination.hasMore\` para saber si hay más.
    `,
  })
  @ApiResponse({ status: 200, description: 'Listado de reservas del guest con pagination' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async getGuestBookings(@Req() req: any, @Body() dto?: ListBookingsDto) {
    const guestId: string = req.user?.userId;
    return this.bookingService.getGuestBookings(guestId, dto);
  }
}
