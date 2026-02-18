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
import { PropertiesCreateService } from './properties-create.service';
import { CreatePropertyDto } from '../dto';

@ApiTags('Properties · Crear / Leer')
@Controller('properties')
export class PropertiesCreateController {
  constructor(private readonly createService: PropertiesCreateService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear propiedad completa',
    description: `
      Crea una propiedad con toda la información del wizard.
      Ejecuta todos los stored procedures en secuencia y envía a revisión.

      **Requiere autenticación:** Token JWT válido.
      **Requiere identidad verificada** para enviar a revisión.
    `,
  })
  @ApiResponse({
    status: 201,
    description: 'Propiedad creada y enviada a revisión',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Propiedad enviada a revisión' },
        data: {
          type: 'object',
          properties: {
            propertyId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos o error de validación' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async create(@Request() req: any, @Body() dto: CreatePropertyDto) {
    const userId = req.user.userId;
    return this.createService.createProperty(userId, dto);
  }
}
