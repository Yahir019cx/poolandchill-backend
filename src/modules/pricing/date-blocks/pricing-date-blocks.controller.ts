import {
  Controller,
  Post,
  Delete,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PricingDateBlocksService } from './pricing-date-blocks.service';
import {
  CreateOwnerDateBlockDto,
  DeleteOwnerDateBlockDto,
} from '../dto';

@ApiTags('Pricing · Date Blocks')
@Controller('pricing/date-blocks')
export class PricingDateBlocksController {
  constructor(private readonly dateBlocksService: PricingDateBlocksService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Crear bloqueo de fechas (owner)',
    description: `
      Bloquea un rango de fechas para una propiedad (pool, cabin o camping).
      Solo el propietario puede crear. No se pueden bloquear fechas en el pasado
      ni fechas que ya tengan reservas confirmadas.
      Reason: maintenance, personal_use, renovation, weather, other.
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Fechas bloqueadas',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            datesBlocked: { type: 'number', example: 3 },
            startDate: { type: 'string', example: '2026-03-20' },
            endDate: { type: 'string', example: '2026-03-22' },
            totalDays: { type: 'number', example: 3 },
            reason: { type: 'string', example: 'maintenance' },
          },
        },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Validación fallida (propiedad, fechas, reservas confirmadas, etc.)' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async create(@Request() req: any, @Body() dto: CreateOwnerDateBlockDto) {
    const userId = req.user.userId;
    return this.dateBlocksService.createOwnerDateBlock(userId, dto);
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Eliminar bloqueo de fechas (owner)',
    description: 'Elimina los bloqueos de fechas del propietario en el rango indicado. Solo el propietario puede eliminar.',
  })
  @ApiResponse({
    status: 200,
    description: 'Fechas desbloqueadas',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            datesUnblocked: { type: 'number', example: 3 },
            startDate: { type: 'string' },
            endDate: { type: 'string' },
          },
        },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Propiedad no encontrada, no eres propietario o no hay bloqueos en ese rango' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async delete(@Request() req: any, @Body() dto: DeleteOwnerDateBlockDto) {
    const userId = req.user.userId;
    return this.dateBlocksService.deleteOwnerDateBlock(userId, dto);
  }
}
