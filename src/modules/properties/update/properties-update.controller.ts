import {
  Controller,
  Patch,
  Post,
  Delete,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PropertiesUpdateService } from './properties-update.service';
import {
  UpdateBasicInfoBodyDto,
  UpdatePoolAmenitiesDto,
  UpdateCabinAmenitiesDto,
  UpdateCampingAmenitiesDto,
  UpdateRulesDto,
  AddPropertyImageDto,
  DeletePropertyImageDto,
} from '../dto/update-property.dto';

@ApiTags('Properties · Editar')
@Controller('properties/update')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class PropertiesUpdateController {
  constructor(private readonly updateService: PropertiesUpdateService) {}

  @Patch('basic-info')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Actualizar información básica',
    description: 'Actualiza descripción y configuración Pool/Cabin/Camping. No permite cambiar el nombre. Solo el dueño.',
  })
  @ApiResponse({ status: 200, description: 'Información básica actualizada' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 403, description: 'No autorizado (no eres el dueño)' })
  async updateBasicInfo(@Request() req: any, @Body() dto: UpdateBasicInfoBodyDto) {
    if (!dto.data || Object.keys(dto.data).length === 0) {
      throw new BadRequestException('Debe enviar al menos un campo para actualizar (description, pool, cabin o camping)');
    }
    const userId = req.user.userId;
    return this.updateService.updateBasicInfo(userId, dto.propertyId, dto.data);
  }

  @Patch('pool-amenities')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Actualizar amenidades de alberca',
    description: 'Actualiza MaxPersons, temperatura y opcionalmente amenidades (reemplaza si se envía JSON). Solo el dueño.',
  })
  @ApiResponse({ status: 200, description: 'Amenidades de alberca actualizadas' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  async updatePoolAmenities(@Request() req: any, @Body() dto: UpdatePoolAmenitiesDto) {
    const userId = req.user.userId;
    return this.updateService.updatePoolAmenities(userId, dto);
  }

  @Patch('cabin-amenities')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Actualizar amenidades de cabaña',
    description: 'Actualiza MaxGuests, habitaciones, camas, baños y opcionalmente amenidades. Solo el dueño.',
  })
  @ApiResponse({ status: 200, description: 'Amenidades de cabaña actualizadas' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  async updateCabinAmenities(@Request() req: any, @Body() dto: UpdateCabinAmenitiesDto) {
    const userId = req.user.userId;
    return this.updateService.updateCabinAmenities(userId, dto);
  }

  @Patch('camping-amenities')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Actualizar amenidades de camping',
    description: 'Actualiza MaxPersons, área, tiendas y opcionalmente amenidades. Solo el dueño.',
  })
  @ApiResponse({ status: 200, description: 'Amenidades de camping actualizadas' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  async updateCampingAmenities(@Request() req: any, @Body() dto: UpdateCampingAmenitiesDto) {
    const userId = req.user.userId;
    return this.updateService.updateCampingAmenities(userId, dto);
  }

  @Patch('rules')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Actualizar reglas',
    description: 'Reemplaza las reglas activas. Debe existir al menos una regla. Solo el dueño.',
  })
  @ApiResponse({ status: 200, description: 'Reglas actualizadas' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  async updateRules(@Request() req: any, @Body() dto: UpdateRulesDto) {
    const userId = req.user.userId;
    return this.updateService.updateRules(userId, dto);
  }

  @Post('images')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Agregar imagen a propiedad',
    description: 'Añade una imagen. Devuelve ID_PropertyImage. Solo el dueño.',
  })
  @ApiResponse({
    status: 201,
    description: 'Imagen agregada',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        idPropertyImage: { type: 'string', format: 'uuid' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  async addImage(@Request() req: any, @Body() dto: AddPropertyImageDto) {
    const userId = req.user.userId;
    return this.updateService.addImage(userId, dto);
  }

  @Delete('images')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Eliminar imagen de propiedad',
    description: 'Elimina una imagen. No permite eliminar la última. Solo el dueño.',
  })
  @ApiResponse({ status: 200, description: 'Imagen eliminada' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  async deleteImage(@Request() req: any, @Body() dto: DeletePropertyImageDto) {
    const userId = req.user.userId;
    return this.updateService.deleteImage(userId, dto);
  }
}
