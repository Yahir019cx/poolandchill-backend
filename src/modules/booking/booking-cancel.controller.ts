import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BookingService } from './booking.service';
import { CalculateRefundDto } from './dto/calculate-refund.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';

@ApiTags('Booking - Cancelación & reembolsos')
@Controller('booking')
export class BookingCancelController {
  constructor(private readonly bookingService: BookingService) {}

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
            policyDescription: {
              type: 'string',
              example:
                'Cancelación con 7+ días de anticipación - Reembolso total',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Booking no encontrado o estado no cancelable',
  })
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
            stripeRefundId: {
              type: 'string',
              nullable: true,
              example: 're_1234567890',
            },
            policyDescription: { type: 'string' },
            message: {
              type: 'string',
              example:
                'Reserva cancelada exitosamente. Reembolso en proceso.',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'No se puede cancelar, sin permisos o estado inválido',
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async cancelBooking(@Body() dto: CancelBookingDto, @Req() req: any) {
    const userId: string = req.user?.userId;
    return this.bookingService.cancelBooking(dto, userId);
  }
}

