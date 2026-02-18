import {
  Controller,
  Post,
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
import { PricingSpecialRateService } from './pricing-special-rate.service';
import { CreateSpecialRateDto, DeactivateSpecialRateDto } from '../dto';

@ApiTags('Pricing · Special Rate')
@Controller('pricing/special-rate')
export class PricingSpecialRateController {
  constructor(private readonly specialRateService: PricingSpecialRateService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Crear tarifa especial',
    description: `
      Crea una tarifa especial para una propiedad (pool, cabin o camping).
      Solo el propietario de la propiedad puede crear.
      Valida: fechas futuras, no solapamiento con otras tarifas activas, tipo de propiedad.
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Tarifa especial creada',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            idSpecialRate: { type: 'string', format: 'uuid' },
            startDate: { type: 'string', example: '2026-03-20' },
            endDate: { type: 'string', example: '2026-03-27' },
            specialPrice: { type: 'number', example: 4500.5 },
            totalDays: { type: 'number', example: 8 },
          },
        },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Validación fallida (propiedad, fechas, solapamiento, etc.)' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async create(@Request() req: any, @Body() dto: CreateSpecialRateDto) {
    const userId = req.user.userId;
    return this.specialRateService.createSpecialRate(userId, dto);
  }

  @Post('deactivate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Desactivar tarifa especial',
    description: 'Desactiva una tarifa especial. Solo el propietario de la propiedad puede desactivar.',
  })
  @ApiResponse({
    status: 200,
    description: 'Tarifa especial desactivada',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            idSpecialRate: { type: 'string', format: 'uuid' },
            startDate: { type: 'string' },
            endDate: { type: 'string' },
          },
        },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Tarifa no encontrada, ya desactivada o no eres propietario' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async deactivate(@Request() req: any, @Body() dto: DeactivateSpecialRateDto) {
    const userId = req.user.userId;
    return this.specialRateService.deactivateSpecialRate(userId, dto.idSpecialRate);
  }
}
