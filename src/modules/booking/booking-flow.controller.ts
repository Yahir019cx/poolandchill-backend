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
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';

@ApiTags('Booking - Entrada & salida')
@Controller('booking')
export class BookingFlowController {
  constructor(private readonly bookingService: BookingService) {}

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
  @ApiResponse({
    status: 400,
    description: 'QR inválido, fecha incorrecta, estado no válido o no es el host',
  })
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
            message: {
              type: 'string',
              example:
                'Check-out exitoso. Payout programado para 2026-03-19 12:30',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Estado no válido, fecha incorrecta o no es el host',
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async checkOut(@Body() dto: CheckOutDto, @Req() req: any) {
    const hostId: string = req.user?.userId;
    return this.bookingService.checkOut(dto, hostId);
  }
}

