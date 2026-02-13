import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  Param,
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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PropertiesService } from './properties.service';
import {
  CreatePropertyDto,
  ChangeStatusDto,
  DeletePropertyDto,
  SearchPropertiesDto,
  AddFavoriteDto,
  GetPropertyByIdDto,
} from './dto';

@ApiTags('Properties')
@Controller('properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  // ══════════════════════════════════════════════════
  // CREAR PROPIEDAD COMPLETA
  // ══════════════════════════════════════════════════

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
    return this.propertiesService.createProperty(userId, dto);
  }

  // ══════════════════════════════════════════════════
  // BÚSQUEDA PÚBLICA
  // ══════════════════════════════════════════════════

  @Get('search')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Buscar propiedades',
    description: `
      Busca propiedades con filtros. Endpoint público.
      Si no se envían filtros, retorna todas las propiedades activas paginadas.
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de propiedades',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            totalCount: { type: 'number', example: 100 },
            page: { type: 'number', example: 1 },
            pageSize: { type: 'number', example: 20 },
            properties: { type: 'array', items: { type: 'object' } },
          },
        },
      },
    },
  })
  async search(@Query() dto: SearchPropertiesDto) {
    return this.propertiesService.searchProperties(dto);
  }

  // ══════════════════════════════════════════════════
  // FAVORITOS (requieren autenticación)
  // ══════════════════════════════════════════════════

  @Get('favorites/ids')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'IDs de favoritos',
    description: 'Lista solo los ID de propiedades favoritas (para pintar el corazón en home).',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de IDs',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            propertyIds: {
              type: 'array',
              items: { type: 'string', format: 'uuid' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async getFavoriteIds(@Request() req: any) {
    const userId = req.user.userId;
    return this.propertiesService.getUserFavoriteIds(userId);
  }

  @Get('favorites')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar favoritos',
    description: 'Lista las propiedades favoritas del usuario (misma forma que search para la card).',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de propiedades favoritas',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            properties: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  propertyId: { type: 'string', format: 'uuid' },
                  propertyName: { type: 'string' },
                  hasPool: { type: 'boolean' },
                  hasCabin: { type: 'boolean' },
                  hasCamping: { type: 'boolean' },
                  location: { type: 'string' },
                  priceFrom: { type: 'number' },
                  images: { type: 'array' },
                  rating: { type: 'string' },
                  reviewCount: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async getFavorites(@Request() req: any) {
    const userId = req.user.userId;
    return this.propertiesService.getUserFavorites(userId);
  }

  @Post('favorites')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Agregar a favoritos',
    description: 'Agrega una propiedad a favoritos. Toggle: si ya está, devuelve error (el cliente puede llamar a DELETE).',
  })
  @ApiResponse({ status: 200, description: 'Agregado a favoritos' })
  @ApiResponse({ status: 400, description: 'Propiedad no existe, no publicada o ya en favoritos' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async addFavorite(@Request() req: any, @Body() dto: AddFavoriteDto) {
    const userId = req.user.userId;
    return this.propertiesService.addFavorite(userId, dto.propertyId);
  }

  @Delete('favorites/:propertyId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Quitar de favoritos',
    description: 'Quita una propiedad de favoritos (pulsar el corazón de nuevo).',
  })
  @ApiResponse({ status: 200, description: 'Eliminado de favoritos' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async removeFavorite(@Request() req: any, @Param('propertyId') propertyId: string) {
    const userId = req.user.userId;
    return this.propertiesService.removeFavorite(userId, propertyId);
  }

  // ══════════════════════════════════════════════════
  // DETALLE DE PROPIEDAD POR ID (body JSON)
  // ══════════════════════════════════════════════════

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
    return this.propertiesService.getPropertyById(dto.propertyId, dto.idOwner ?? null);
  }

  // ══════════════════════════════════════════════════
  // CONSULTAS (OWNER)
  // ══════════════════════════════════════════════════

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
    return this.propertiesService.getMyProperties(
      userId,
      status,
      page || 1,
      pageSize || 10,
    );
  }

  // ══════════════════════════════════════════════════
  // GESTIÓN DE ESTADO (OWNER)
  // ══════════════════════════════════════════════════

  @Post('owner/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cambiar estado de propiedad (Owner)',
    description: 'Pausar (4) o reactivar (3) una propiedad. Solo el dueño puede cambiar el estado.',
  })
  @ApiResponse({ status: 200, description: 'Estado cambiado exitosamente' })
  @ApiResponse({ status: 400, description: 'Error al cambiar estado' })
  @ApiResponse({ status: 403, description: 'No tienes permisos para esta acción' })
  async changeStatus(
    @Request() req: any,
    @Body() dto: ChangeStatusDto,
  ) {
    const userId = req.user.userId;
    return this.propertiesService.changeStatus(userId, dto.propertyId, dto.status);
  }

  @Post('owner/delete')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Eliminar propiedad (Owner)',
    description: 'Elimina una propiedad (soft delete). Solo el dueño puede eliminar.',
  })
  @ApiResponse({ status: 200, description: 'Propiedad eliminada' })
  @ApiResponse({ status: 400, description: 'Error al eliminar' })
  @ApiResponse({ status: 403, description: 'No tienes permisos para esta acción' })
  async delete(
    @Request() req: any,
    @Body() dto: DeletePropertyDto,
  ) {
    const userId = req.user.userId;
    return this.propertiesService.deleteProperty(userId, dto.propertyId);
  }
}
