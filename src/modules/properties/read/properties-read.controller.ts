import {
  Controller,
  Get,
  Post,
  Body,
  Query,
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
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PropertiesReadService } from './properties-read.service';
import { GetPropertyByIdDto } from '../dto';

@ApiTags('Properties · Crear / Leer')
@Controller('properties')
export class PropertiesReadController {
  constructor(private readonly readService: PropertiesReadService) {}

  @Post('by-id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener propiedad completa por ID',
    description: `
      Devuelve toda la información de una propiedad: datos generales, ubicación,
      albercas con amenidades, cabañas con amenidades, áreas de camping con amenidades,
      reglas e imágenes. Body JSON: solo es obligatorio propertyId; idOwner es opcional
      (si se envía, solo devuelve la propiedad si pertenece a ese dueño).
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Propiedad con todos sus datos',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            property: { type: 'object' },
            pools: { type: 'array' },
            cabins: { type: 'array' },
            campingAreas: { type: 'array' },
            rules: { type: 'array' },
            images: { type: 'array' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Propiedad no encontrada o ID inválido' })
  async getPropertyById(@Body() dto: GetPropertyByIdDto) {
    return this.readService.getPropertyById(dto.propertyId, dto.idOwner ?? null);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar propiedades del dueño',
    description: 'Obtiene las propiedades del dueño autenticado con paginación.',
  })
  @ApiQuery({ name: 'status', required: false, type: Number, description: 'Filtrar por estado' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Número de página (default: 1)' })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, description: 'Tamaño de página (default: 10)' })
  @ApiResponse({
    status: 200,
    description: 'Lista de propiedades del dueño',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            totalCount: { type: 'number', example: 5 },
            page: { type: 'number', example: 1 },
            pageSize: { type: 'number', example: 10 },
            properties: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  propertyId: { type: 'string', format: 'uuid' },
                  propertyName: { type: 'string', example: 'Rancho Los Pinos' },
                  description: { type: 'string', nullable: true },
                  hasPool: { type: 'boolean' },
                  hasCabin: { type: 'boolean' },
                  hasCamping: { type: 'boolean' },
                  currentStep: { type: 'number', example: 5 },
                  status: {
                    type: 'object',
                    properties: {
                      id: { type: 'number', example: 3 },
                      name: { type: 'string', example: 'Publicado' },
                      code: { type: 'string', example: 'published' },
                    },
                  },
                  priceFrom: { type: 'number', example: 1500.0 },
                  images: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        imageUrl: { type: 'string' },
                        isPrimary: { type: 'boolean' },
                        displayOrder: { type: 'number' },
                      },
                    },
                  },
                  location: {
                    type: 'object',
                    properties: {
                      formattedAddress: { type: 'string', nullable: true },
                      city: { type: 'string', example: 'Aguascalientes' },
                      state: { type: 'string', example: 'Aguascalientes' },
                    },
                  },
                  createdAt: { type: 'string', format: 'date-time' },
                  updatedAt: { type: 'string', format: 'date-time', nullable: true },
                  submittedAt: { type: 'string', format: 'date-time', nullable: true },
                },
              },
            },
          },
        },
      },
    },
  })
  async getMyProperties(
    @Request() req: any,
    @Query('status') status?: number,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    const userId = req.user.userId;
    return this.readService.getMyProperties(
      userId,
      status,
      page || 1,
      pageSize || 10,
    );
  }
}
