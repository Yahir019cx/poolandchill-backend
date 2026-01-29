import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PropertiesService } from './properties.service';
import { CreatePropertyDto, ChangeStatusDto } from './dto';

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
  // CONSULTAS
  // ══════════════════════════════════════════════════

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar mis propiedades',
    description: 'Obtiene las propiedades del usuario autenticado con paginación.',
  })
  @ApiQuery({ name: 'status', required: false, type: Number, description: 'Filtrar por estado' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Número de página (default: 1)' })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, description: 'Tamaño de página (default: 10)' })
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
            totalCount: { type: 'number', example: 5 },
            page: { type: 'number', example: 1 },
            pageSize: { type: 'number', example: 10 },
            properties: { type: 'array', items: { type: 'object' } },
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

  @Get('catalogs/amenities')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener catálogo de amenidades',
    description: 'Retorna las amenidades disponibles, opcionalmente filtradas por categoría.',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    type: String,
    description: 'Categoría: pool, cabin, camping',
  })
  async getAmenities(@Query('category') category?: string) {
    return this.propertiesService.getAmenities(category);
  }

  @Get('catalogs/states')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener catálogo de estados',
    description: 'Retorna la lista de estados disponibles.',
  })
  async getStates() {
    return this.propertiesService.getStates();
  }

  @Get('catalogs/cities/:stateId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener ciudades por estado',
    description: 'Retorna las ciudades de un estado específico.',
  })
  @ApiParam({ name: 'stateId', type: Number, description: 'ID del estado' })
  async getCities(@Param('stateId', ParseIntPipe) stateId: number) {
    return this.propertiesService.getCities(stateId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener propiedad por ID',
    description: 'Obtiene los detalles completos de una propiedad.',
  })
  @ApiParam({ name: 'id', type: String, description: 'UUID de la propiedad' })
  @ApiResponse({ status: 200, description: 'Propiedad encontrada' })
  @ApiResponse({ status: 404, description: 'Propiedad no encontrada' })
  async getProperty(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const userId = req.user.userId;
    return this.propertiesService.getProperty(userId, id);
  }

  // ══════════════════════════════════════════════════
  // GESTIÓN DE ESTADO
  // ══════════════════════════════════════════════════

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cambiar estado de propiedad',
    description: 'Pausar (4) o reactivar (3) una propiedad.',
  })
  @ApiParam({ name: 'id', type: String, description: 'UUID de la propiedad' })
  @ApiResponse({ status: 200, description: 'Estado cambiado exitosamente' })
  @ApiResponse({ status: 400, description: 'Error al cambiar estado' })
  async changeStatus(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeStatusDto,
  ) {
    const userId = req.user.userId;
    return this.propertiesService.changeStatus(userId, id, dto.status);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Eliminar propiedad',
    description: 'Elimina una propiedad (soft delete).',
  })
  @ApiParam({ name: 'id', type: String, description: 'UUID de la propiedad' })
  @ApiResponse({ status: 200, description: 'Propiedad eliminada' })
  @ApiResponse({ status: 400, description: 'Error al eliminar' })
  async delete(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const userId = req.user.userId;
    return this.propertiesService.deleteProperty(userId, id);
  }
}
