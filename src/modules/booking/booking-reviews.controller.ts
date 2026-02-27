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
import { CreateGuestReviewDto } from './dto/create-guest-review.dto';
import { CreatePropertyReviewDto } from './dto/create-property-review.dto';
import { CreateHostReviewDto } from './dto/create-host-review.dto';

@ApiTags('Booking - Reviews')
@Controller('booking')
export class BookingReviewsController {
  constructor(private readonly bookingService: BookingService) {}

  @Post('guest/review')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Crear reseña del huésped (host califica al guest)',
    description: `
      Crea una reseña para el huésped asociada a una reserva completada.
      Valida que:
      - La reserva exista y esté en estado completed.
      - El host autenticado sea el dueño de la reserva.
      - No exista ya una reseña previa para esa reserva.
      - Los ratings estén entre 1.0 y 5.0.

      El ID_Host se toma del JWT (userId), no del body.

      **Requiere autenticación JWT del host.**
    `,
  })
  @ApiResponse({
    status: 201,
    description: 'Reseña del huésped creada correctamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'Review creada correctamente.',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Booking no encontrado, no completed, ya calificado, ratings fuera de rango o el usuario no es el host',
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 500, description: 'Error en el servidor' })
  async createGuestReview(@Body() dto: CreateGuestReviewDto, @Req() req: any) {
    const hostId: string = req.user?.userId;
    return this.bookingService.createGuestReview(dto, hostId);
  }

  @Post('property/review')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Crear reseña de la propiedad (guest califica propiedad)',
    description: `
      Crea una reseña para la propiedad asociada a una reserva completada.
      Valida que:
      - La reserva exista y pertenezca al guest autenticado.
      - La reserva esté en estado completed.
      - No exista ya una reseña de propiedad para esa reserva.
      - Los ratings estén entre 1.0 y 5.0.

      El ID_Guest se toma del JWT (userId), no del body.

      **Requiere autenticación JWT del guest.**
    `,
  })
  @ApiResponse({
    status: 201,
    description: 'Reseña de la propiedad creada correctamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'Review de propiedad creada correctamente.',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Reserva no encontrada, no completed, ya calificada o ratings fuera de rango',
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 500, description: 'Error en el servidor' })
  async createPropertyReview(
    @Body() dto: CreatePropertyReviewDto,
    @Req() req: any,
  ) {
    const guestId: string = req.user?.userId;
    return this.bookingService.createPropertyReview(dto, guestId);
  }

  @Post('host/review')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Crear reseña del host (guest califica al host)',
    description: `
      Crea una reseña para el host asociada a una reserva completada.
      Valida que:
      - La reserva exista y pertenezca al guest autenticado.
      - La reserva esté en estado completed.
      - No exista ya una reseña del host para esa reserva.
      - Los ratings estén entre 1.0 y 5.0.

      El ID_Guest se toma del JWT (userId), no del body.

      **Requiere autenticación JWT del guest.**
    `,
  })
  @ApiResponse({
    status: 201,
    description: 'Reseña del host creada correctamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'Review del host creada correctamente.',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Reserva no encontrada, no completed, ya calificada o ratings fuera de rango',
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 500, description: 'Error en el servidor' })
  async createHostReview(@Body() dto: CreateHostReviewDto, @Req() req: any) {
    const guestId: string = req.user?.userId;
    return this.bookingService.createHostReview(dto, guestId);
  }
}

